-- 1. Create sop_acks table to track user acknowledgments
CREATE TABLE public.sop_acks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id uuid NOT NULL REFERENCES public.sops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, -- auth.users.id
  org_user_id uuid REFERENCES public.org_users(id) ON DELETE SET NULL,
  ack_epoch int NOT NULL, -- the epoch at which they acknowledged
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  UNIQUE (sop_id, user_id, ack_epoch)
);

CREATE INDEX idx_sop_acks_sop_id ON public.sop_acks(sop_id);
CREATE INDEX idx_sop_acks_user_id ON public.sop_acks(user_id);
CREATE INDEX idx_sop_acks_org_user_id ON public.sop_acks(org_user_id);

-- Enable RLS
ALTER TABLE public.sop_acks ENABLE ROW LEVEL SECURITY;

-- Users can view their own acknowledgments
CREATE POLICY "Users can view their own acks"
  ON public.sop_acks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own acknowledgments
CREATE POLICY "Users can create their own acks"
  ON public.sop_acks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Org admins can view all acks for their org's SOPs
CREATE POLICY "Org admins can view org sop acks"
  ON public.sop_acks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sops s
      WHERE s.id = sop_id
        AND s.org_id IS NOT NULL
        AND is_org_admin(auth.uid(), s.org_id)
    )
  );

-- 2. Create sop_role_assignments table
CREATE TABLE public.sop_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id uuid NOT NULL REFERENCES public.sops(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'foreman', 'painter', 'office', 'other', 'all')),
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.org_users(id),
  UNIQUE (sop_id, org_id, role)
);

CREATE INDEX idx_sop_role_assignments_sop_id ON public.sop_role_assignments(sop_id);
CREATE INDEX idx_sop_role_assignments_org_id ON public.sop_role_assignments(org_id);
CREATE INDEX idx_sop_role_assignments_role ON public.sop_role_assignments(role);

-- Enable RLS
ALTER TABLE public.sop_role_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view assignments for their org
CREATE POLICY "Users can view their org assignments"
  ON public.sop_role_assignments FOR SELECT
  USING (org_id = get_user_org_id(auth.uid()));

-- Org admins can manage assignments
CREATE POLICY "Org admins can manage assignments"
  ON public.sop_role_assignments FOR ALL
  USING (is_org_admin(auth.uid(), org_id))
  WITH CHECK (is_org_admin(auth.uid(), org_id));

-- 3. Create helper function to check if user has acknowledged current epoch
CREATE OR REPLACE FUNCTION public.has_acknowledged_sop(_user_id uuid, _sop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sop_acks a
    JOIN public.sops s ON s.id = a.sop_id
    WHERE a.user_id = _user_id
      AND a.sop_id = _sop_id
      AND a.ack_epoch = s.ack_epoch
  )
$$;

-- 4. Create function to get SOPs assigned to a user based on their role
CREATE OR REPLACE FUNCTION public.get_user_assigned_sops(_user_id uuid)
RETURNS TABLE (
  sop_id uuid,
  title text,
  content_md text,
  version int,
  ack_epoch int,
  ack_required boolean,
  is_acknowledged boolean,
  source text,
  system_key text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_org AS (
    SELECT org_id, role
    FROM public.org_users
    WHERE user_id = _user_id AND is_active = true
    LIMIT 1
  )
  SELECT DISTINCT
    s.id as sop_id,
    s.title,
    s.content_md,
    s.version,
    s.ack_epoch,
    s.ack_required,
    has_acknowledged_sop(_user_id, s.id) as is_acknowledged,
    s.source,
    s.system_key
  FROM public.sops s
  LEFT JOIN public.sop_role_assignments sra ON sra.sop_id = s.id
  CROSS JOIN user_org uo
  WHERE s.status = 'active'
    AND (
      -- System SOPs (available to everyone)
      s.source = 'system'
      OR
      -- Org SOPs assigned to user's role or 'all'
      (s.org_id = uo.org_id AND (sra.role = uo.role OR sra.role = 'all'))
    )
  ORDER BY s.title;
$$;