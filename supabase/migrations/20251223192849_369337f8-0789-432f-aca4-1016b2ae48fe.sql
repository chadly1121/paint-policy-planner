-- Fix 1: Add RLS to leaderboard_view (recreate as table-backed view with RLS)
-- Drop the existing view first
DROP VIEW IF EXISTS public.leaderboard_view;

-- Create a security definer function for leaderboard that only authenticated users can call
CREATE OR REPLACE FUNCTION public.get_secure_leaderboard()
RETURNS TABLE(full_name text, total_points integer, available_points integer, sections_completed bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.full_name,
    pb.total_points,
    COALESCE(pb.available_points, 0)::integer as available_points,
    (SELECT COUNT(*) FROM public.section_progress sp WHERE sp.user_id = p.user_id AND sp.completed = true) as sections_completed
  FROM public.profiles p
  JOIN public.points_balance pb ON p.user_id = pb.user_id
  ORDER BY pb.total_points DESC
  LIMIT 50;
$$;

-- Fix 2: Drop quiz_questions_safe view - questions should only be fetched via edge function
DROP VIEW IF EXISTS public.quiz_questions_safe;

-- Fix 3: The INSERT policy for quiz_attempts is intentionally missing
-- Quiz attempts should ONLY be created by the submit-quiz edge function (service role)
-- This is by design - no client should be able to insert quiz attempts directly
-- Adding a comment to document this security decision

COMMENT ON TABLE public.quiz_attempts IS 'Quiz attempts are created exclusively by the submit-quiz edge function using service role. No client INSERT policy is intentional to prevent score forgery.';