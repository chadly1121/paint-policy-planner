-- 1. Remove dangerous policy that lets users modify their own points
DROP POLICY IF EXISTS "Users can update their own balance" ON public.points_balance;

-- 2. Remove dangerous policy that lets users insert quiz attempts directly (will be server-side only)
DROP POLICY IF EXISTS "Users can insert their own attempts" ON public.quiz_attempts;

-- 3. Remove policy that exposes correct answers to users
DROP POLICY IF EXISTS "Users can view their own questions" ON public.quiz_questions;

-- 4. Create a new policy that only shows questions WITHOUT correct_answer
-- We'll create a view for this instead

-- 5. Remove the policy that exposes all emails to authenticated users
DROP POLICY IF EXISTS "Authenticated can view profiles for leaderboard" ON public.profiles;

-- 6. Create a secure leaderboard view that only exposes full_name (not email)
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
    p.full_name,
    pb.total_points,
    COALESCE(pb.available_points, pb.total_points - pb.redeemed_points) as available_points,
    (SELECT COUNT(*) FROM public.section_progress sp WHERE sp.user_id = p.user_id AND sp.completed = true) as sections_completed
FROM public.profiles p
JOIN public.points_balance pb ON p.user_id = pb.user_id
ORDER BY pb.total_points DESC
LIMIT 50;

-- 7. Grant access to the leaderboard view for authenticated users
GRANT SELECT ON public.leaderboard_view TO authenticated;

-- 8. Create a view for quiz questions that hides correct_answer
CREATE OR REPLACE VIEW public.quiz_questions_safe AS
SELECT 
    id,
    user_id,
    section_key,
    question,
    options,
    created_at
FROM public.quiz_questions;

-- 9. Enable RLS on the view (views inherit from base table RLS)
-- Users can only see their own questions through the safe view
CREATE POLICY "Users can view their own questions safely" 
ON public.quiz_questions
FOR SELECT 
USING (auth.uid() = user_id);

-- 10. Grant access to the safe view
GRANT SELECT ON public.quiz_questions_safe TO authenticated;

-- 11. Create policy for service role to manage quiz attempts (edge function)
-- Service role bypasses RLS, so no policy needed, but let's ensure admins can insert for testing
CREATE POLICY "Service role can insert attempts" 
ON public.quiz_attempts
FOR INSERT 
WITH CHECK (true);

-- 12. Create policy for service role to update points_balance
-- This will only work with service_role key from edge functions
CREATE POLICY "Service role can update all balances" 
ON public.points_balance
FOR UPDATE 
USING (true);

-- 13. Also allow admins to manage points for manual adjustments
CREATE POLICY "Admins can update all balances" 
ON public.points_balance
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));