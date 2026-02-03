-- Security Fix 4: Restrict system SOPs to authenticated users only
-- Currently unauthenticated users can view system SOPs which reveals business procedures
DROP POLICY IF EXISTS "Anyone can view system SOPs" ON public.sops;

CREATE POLICY "Authenticated users can view system SOPs"
ON public.sops
FOR SELECT
TO authenticated
USING ((source = 'system'::text) AND (org_id IS NULL));