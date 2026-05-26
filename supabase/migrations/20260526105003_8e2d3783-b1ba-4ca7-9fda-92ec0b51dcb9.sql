
-- ============ Part 1: Helper functions ============

CREATE OR REPLACE FUNCTION public.get_user_org_role(_user_id uuid, _org_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.org_users
  WHERE user_id = _user_id AND org_id = _org_id AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_org_office(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_user_org_role(_user_id, _org_id) = 'office';
$$;

CREATE OR REPLACE FUNCTION public.is_org_foreman(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_user_org_role(_user_id, _org_id) = 'foreman';
$$;

CREATE OR REPLACE FUNCTION public.can_manage_employees(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_org_admin(_user_id, _org_id) OR public.is_org_office(_user_id, _org_id);
$$;

CREATE OR REPLACE FUNCTION public.can_approve_time(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_org_admin(_user_id, _org_id)
      OR public.is_org_office(_user_id, _org_id)
      OR public.is_org_foreman(_user_id, _org_id);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_rewards(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_org_admin(_user_id, _org_id) OR public.is_org_office(_user_id, _org_id);
$$;

-- ============ Part 2: OHSA flags on org_users ============

ALTER TABLE public.org_users
  ADD COLUMN IF NOT EXISTS is_hsr boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_safety_supervisor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hsr_designated_at timestamptz,
  ADD COLUMN IF NOT EXISTS hsr_training_completed_at date,
  ADD COLUMN IF NOT EXISTS safety_supervisor_designated_at timestamptz;

-- HSR must be a non-management worker
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hsr_must_be_worker'
  ) THEN
    ALTER TABLE public.org_users
      ADD CONSTRAINT hsr_must_be_worker
      CHECK (is_hsr = false OR role IN ('painter', 'other'));
  END IF;
END $$;

-- Trigger to enforce single HSR per org (unset other rows automatically)
CREATE OR REPLACE FUNCTION public.enforce_single_hsr_per_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_hsr = true THEN
    UPDATE public.org_users
       SET is_hsr = false,
           hsr_designated_at = NULL
     WHERE org_id = NEW.org_id
       AND id <> NEW.id
       AND is_hsr = true;
    IF NEW.hsr_designated_at IS NULL THEN
      NEW.hsr_designated_at := now();
    END IF;
  END IF;

  IF NEW.is_safety_supervisor = true
     AND (TG_OP = 'INSERT' OR OLD.is_safety_supervisor = false)
     AND NEW.safety_supervisor_designated_at IS NULL THEN
    NEW.safety_supervisor_designated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_hsr ON public.org_users;
CREATE TRIGGER trg_enforce_single_hsr
BEFORE INSERT OR UPDATE OF is_hsr, is_safety_supervisor ON public.org_users
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_hsr_per_org();

-- ============ Part 3: RLS tightening ============

-- org_users: allow office to view all org members
DROP POLICY IF EXISTS "Users can view members of their org" ON public.org_users;
CREATE POLICY "Managers view all org members" ON public.org_users
  FOR SELECT USING (public.can_manage_employees(auth.uid(), org_id));
CREATE POLICY "Users view own org_user record" ON public.org_users
  FOR SELECT USING (user_id = auth.uid());

-- profiles: office can view org-mate profiles
CREATE POLICY "Managers view org member profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.org_users ou_target
      WHERE ou_target.user_id = profiles.user_id
        AND ou_target.is_active = true
        AND public.can_manage_employees(auth.uid(), ou_target.org_id)
    )
  );

-- redemption_items: office can manage too
DROP POLICY IF EXISTS "Org admins can manage items" ON public.redemption_items;
CREATE POLICY "Managers can manage reward items" ON public.redemption_items
  FOR ALL
  USING (public.can_manage_rewards(auth.uid(), org_id))
  WITH CHECK (public.can_manage_rewards(auth.uid(), org_id));
