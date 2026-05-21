ALTER TABLE public.sop_acks ADD COLUMN IF NOT EXISTS quiz_total integer;

WITH src AS (
  SELECT a.id AS ack_id,
         (
           SELECT q.total_questions
           FROM public.quiz_attempts q
           WHERE q.user_id = a.user_id
             AND q.passed = true
             AND q.section_key = COALESCE(s.system_key, s.id::text)
           ORDER BY q.created_at DESC
           LIMIT 1
         ) AS total_questions
  FROM public.sop_acks a
  JOIN public.sops s ON s.id = a.sop_id
  WHERE a.quiz_score IS NOT NULL
    AND a.quiz_total IS NULL
)
UPDATE public.sop_acks a
SET quiz_total = src.total_questions
FROM src
WHERE a.id = src.ack_id
  AND src.total_questions IS NOT NULL;