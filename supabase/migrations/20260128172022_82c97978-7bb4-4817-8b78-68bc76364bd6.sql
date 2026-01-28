-- Update the get_secure_leaderboard function to filter by the caller's organization
CREATE OR REPLACE FUNCTION public.get_secure_leaderboard()
RETURNS TABLE(full_name text, total_points integer, available_points integer, sections_completed bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH caller_org AS (
    SELECT org_id
    FROM public.org_users
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1
  )
  SELECT 
    p.full_name,
    pb.total_points,
    COALESCE(pb.available_points, 0)::integer as available_points,
    (SELECT COUNT(*) FROM public.section_progress sp WHERE sp.user_id = p.user_id AND sp.completed = true) as sections_completed
  FROM public.profiles p
  JOIN public.points_balance pb ON p.user_id = pb.user_id
  JOIN public.org_users ou ON p.user_id = ou.user_id AND ou.is_active = true
  JOIN caller_org co ON ou.org_id = co.org_id
  ORDER BY pb.total_points DESC
  LIMIT 50;
$$;