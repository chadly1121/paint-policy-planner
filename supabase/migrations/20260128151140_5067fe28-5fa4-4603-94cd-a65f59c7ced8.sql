-- Fix infinite recursion in org_users SELECT policy
-- The current policy references org_users in a subquery, causing recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view members of their org" ON public.org_users;

-- Create a fixed policy using the security definer function
CREATE POLICY "Users can view members of their org"
ON public.org_users
FOR SELECT
USING (
  org_id = get_user_org_id(auth.uid())
  OR user_id = auth.uid()
);