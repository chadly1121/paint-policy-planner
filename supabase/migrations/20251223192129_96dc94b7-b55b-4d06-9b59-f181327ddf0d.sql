-- Fix remaining security issues

-- 1. Remove the overly permissive profile policy
DROP POLICY IF EXISTS "Users can view names for leaderboard" ON public.profiles;

-- 2. The leaderboard_view and quiz_questions_safe inherit from base table RLS
-- Views with security_invoker use the querying user's permissions
-- Since profiles now requires auth, the leaderboard view will too

-- 3. For quiz_attempts - the edge function uses service role which bypasses RLS
-- This is correct - users should NOT be able to insert attempts directly
-- The warning about missing INSERT policy is intentional for security

-- 4. Update the quiz_questions policy to only allow viewing through authenticated access
-- The safe view already excludes correct_answer