-- Security Fix 1: Restrict sop_assignments SELECT policy to org members only
-- Currently allows ANY authenticated user to view ALL assignments (security risk)
DROP POLICY IF EXISTS "Users can view SOP assignments" ON public.sop_assignments;

CREATE POLICY "Users can view their org SOP assignments"
ON public.sop_assignments
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT ou.user_id 
    FROM public.org_users ou 
    WHERE ou.org_id = get_user_org_id(auth.uid()) 
    AND ou.is_active = true
  )
);

-- Security Fix 2: Restrict certificates access - only admins can view all org certificates
-- Currently all org members can see each other's certifications
DROP POLICY IF EXISTS "Org members can view org certificates" ON public.certificates;

CREATE POLICY "Org admins can view org certificates"
ON public.certificates
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  (org_id IS NOT NULL AND is_org_admin(auth.uid(), org_id))
);

-- Security Fix 3: Prevent admins from processing their own redemption requests
-- Add separation of duties for audit compliance
DROP POLICY IF EXISTS "Admins can update all requests" ON public.redemption_requests;

CREATE POLICY "Admins can update others requests"
ON public.redemption_requests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  user_id != auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND 
  user_id != auth.uid()
);