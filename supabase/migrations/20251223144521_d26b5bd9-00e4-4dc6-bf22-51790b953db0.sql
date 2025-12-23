-- Fix the leaderboard view security issue by using SECURITY INVOKER
DROP VIEW IF EXISTS public.leaderboard;

-- Recreate leaderboard as a regular view (SECURITY INVOKER is the default)
-- We'll create it as a function instead for proper RLS enforcement
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  full_name TEXT,
  total_points INTEGER,
  available_points INTEGER,
  sections_completed BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    p.full_name,
    pb.total_points,
    pb.available_points,
    (SELECT COUNT(*) FROM public.section_progress sp WHERE sp.user_id = p.user_id AND sp.completed = true) as sections_completed
  FROM public.profiles p
  JOIN public.points_balance pb ON p.user_id = pb.user_id
  ORDER BY pb.total_points DESC
  LIMIT 50;
$$;

-- Add policy for admins to view all profiles (for leaderboard)
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Add policy for authenticated users to view leaderboard data (limited)
CREATE POLICY "Authenticated can view profiles for leaderboard" ON public.profiles
  FOR SELECT TO authenticated USING (true);