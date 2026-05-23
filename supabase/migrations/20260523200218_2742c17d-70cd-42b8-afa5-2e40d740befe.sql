
-- 1. Org-level settings
ALTER TABLE public.orgs
  ADD COLUMN IF NOT EXISTS reack_grace_days int NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS auto_block_uncompliant boolean NOT NULL DEFAULT false;

-- 2. The tracking table
CREATE TABLE IF NOT EXISTS public.doc_reack_required (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  org_user_id uuid NOT NULL REFERENCES public.org_users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sop_id uuid NOT NULL REFERENCES public.sops(id) ON DELETE CASCADE,
  new_ack_epoch int NOT NULL,
  previous_ack_epoch int NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  first_notified_at timestamptz,
  sent_overdue_at timestamptz,
  reack_deadline timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_user_id, sop_id, new_ack_epoch)
);

CREATE INDEX IF NOT EXISTS idx_doc_reack_user_open
  ON public.doc_reack_required (user_id) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doc_reack_org_open
  ON public.doc_reack_required (org_id) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doc_reack_deadline
  ON public.doc_reack_required (reack_deadline) WHERE completed_at IS NULL;

ALTER TABLE public.doc_reack_required ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own pending reacks"
  ON public.doc_reack_required FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Org admins see org reacks"
  ON public.doc_reack_required FOR SELECT
  USING (public.is_org_admin(auth.uid(), org_id));

-- 3. Trigger: when sops.ack_epoch increments, enqueue re-ack rows
CREATE OR REPLACE FUNCTION public.enqueue_doc_reack_on_epoch_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  grace_days int;
BEGIN
  IF NEW.ack_epoch IS DISTINCT FROM OLD.ack_epoch
     AND NEW.ack_epoch > COALESCE(OLD.ack_epoch, 0) THEN

    INSERT INTO public.doc_reack_required (
      org_id, org_user_id, user_id, sop_id,
      new_ack_epoch, previous_ack_epoch, reack_deadline
    )
    SELECT
      ou.org_id,
      ou.id,
      a.user_id,
      NEW.id,
      NEW.ack_epoch,
      OLD.ack_epoch,
      now() + (COALESCE(o.reack_grace_days, 14) || ' days')::interval
    FROM public.sop_acks a
    JOIN public.org_users ou ON ou.user_id = a.user_id AND ou.is_active = true
    JOIN public.orgs o ON o.id = ou.org_id
    WHERE a.sop_id = NEW.id
      AND a.ack_epoch = OLD.ack_epoch
    ON CONFLICT (org_user_id, sop_id, new_ack_epoch) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_doc_reack ON public.sops;
CREATE TRIGGER trg_enqueue_doc_reack
AFTER UPDATE ON public.sops
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_doc_reack_on_epoch_change();

-- 4. Trigger: when a fresh sop_acks row is inserted at the new epoch, close the open re-ack
CREATE OR REPLACE FUNCTION public.complete_doc_reack_on_ack()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.doc_reack_required
  SET completed_at = now()
  WHERE user_id = NEW.user_id
    AND sop_id = NEW.sop_id
    AND new_ack_epoch = NEW.ack_epoch
    AND completed_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complete_doc_reack ON public.sop_acks;
CREATE TRIGGER trg_complete_doc_reack
AFTER INSERT ON public.sop_acks
FOR EACH ROW
EXECUTE FUNCTION public.complete_doc_reack_on_ack();
