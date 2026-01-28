-- Create table to track hidden system SOPs per organization
CREATE TABLE public.org_hidden_sops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  system_key text NOT NULL,
  hidden_by uuid REFERENCES public.org_users(id),
  hidden_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, system_key)
);

-- Enable RLS
ALTER TABLE public.org_hidden_sops ENABLE ROW LEVEL SECURITY;

-- Org admins can manage hidden SOPs
CREATE POLICY "Org admins can manage hidden sops"
ON public.org_hidden_sops
FOR ALL
USING (is_org_admin(auth.uid(), org_id))
WITH CHECK (is_org_admin(auth.uid(), org_id));

-- Users can view their org's hidden SOPs
CREATE POLICY "Users can view their org hidden sops"
ON public.org_hidden_sops
FOR SELECT
USING (org_id = get_user_org_id(auth.uid()));

-- Update the get_user_assigned_sops function to exclude hidden system SOPs
CREATE OR REPLACE FUNCTION public.get_user_assigned_sops(_user_id uuid)
RETURNS TABLE(
  sop_id uuid,
  title text,
  content_md text,
  version integer,
  ack_epoch integer,
  ack_required boolean,
  is_acknowledged boolean,
  source text,
  system_key text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH user_org AS (
    SELECT org_id, role
    FROM public.org_users
    WHERE user_id = _user_id AND is_active = true
    LIMIT 1
  ),
  hidden_keys AS (
    SELECT h.system_key
    FROM public.org_hidden_sops h
    JOIN user_org uo ON h.org_id = uo.org_id
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
      -- System SOPs (available to everyone, unless hidden)
      (s.source = 'system' AND s.system_key NOT IN (SELECT system_key FROM hidden_keys))
      OR
      -- Org SOPs assigned to user's role or 'all'
      (s.org_id = uo.org_id AND (sra.role = uo.role OR sra.role = 'all'))
    )
  ORDER BY s.title;
$$;