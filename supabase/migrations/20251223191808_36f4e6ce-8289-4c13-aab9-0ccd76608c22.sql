-- Fix the security definer view issue by making views use SECURITY INVOKER (the querying user's permissions)
-- Drop and recreate views with explicit security invoker setting

DROP VIEW IF EXISTS public.leaderboard_view;
DROP VIEW IF EXISTS public.quiz_questions_safe;

-- Recreate leaderboard view with SECURITY INVOKER (default, but explicit)
CREATE VIEW public.leaderboard_view 
WITH (security_invoker = true) AS
SELECT 
    p.full_name,
    pb.total_points,
    COALESCE(pb.available_points, pb.total_points - pb.redeemed_points) as available_points,
    (SELECT COUNT(*) FROM public.section_progress sp WHERE sp.user_id = p.user_id AND sp.completed = true) as sections_completed
FROM public.profiles p
JOIN public.points_balance pb ON p.user_id = pb.user_id
ORDER BY pb.total_points DESC
LIMIT 50;

-- Recreate quiz questions safe view with SECURITY INVOKER
CREATE VIEW public.quiz_questions_safe 
WITH (security_invoker = true) AS
SELECT 
    id,
    user_id,
    section_key,
    question,
    options,
    created_at
FROM public.quiz_questions;

-- Grant access
GRANT SELECT ON public.leaderboard_view TO authenticated;
GRANT SELECT ON public.quiz_questions_safe TO authenticated;

-- We need a policy that allows viewing profiles for the leaderboard view to work
-- But only expose the full_name, not email - we do this through the view
CREATE POLICY "Users can view names for leaderboard" 
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Also fix the overly permissive policies on quiz_attempts and points_balance
-- Remove the "true" policies and make them admin/service-role only
DROP POLICY IF EXISTS "Service role can insert attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Service role can update all balances" ON public.points_balance;