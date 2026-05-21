-- 1. awards: add stable code + auto-granted flag, plus an index for quick "already granted?" checks
ALTER TABLE public.awards
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS auto_granted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_awards_user_code ON public.awards (user_id, code) WHERE code IS NOT NULL;

-- 2. incident_reports: near-miss flag
ALTER TABLE public.incident_reports
  ADD COLUMN IF NOT EXISTS is_near_miss boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_incident_reports_near_miss_reporter
  ON public.incident_reports (reported_by, created_at) WHERE is_near_miss = true;

-- 3. section_progress: language the user completed it in
ALTER TABLE public.section_progress
  ADD COLUMN IF NOT EXISTS language_completed_in text;

-- Auto-stamp language_completed_in from the user's preferred language at completion time.
CREATE OR REPLACE FUNCTION public.stamp_section_completion_language()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.completed = true
     AND (TG_OP = 'INSERT' OR OLD.completed IS DISTINCT FROM NEW.completed)
     AND NEW.language_completed_in IS NULL THEN
    SELECT preferred_language INTO NEW.language_completed_in
    FROM public.profiles WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_section_completion_language ON public.section_progress;
CREATE TRIGGER trg_stamp_section_completion_language
BEFORE INSERT OR UPDATE ON public.section_progress
FOR EACH ROW EXECUTE FUNCTION public.stamp_section_completion_language();