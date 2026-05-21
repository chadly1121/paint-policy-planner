
ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS onboarding_welcome_message text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_onboarding_complete_if_done()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assigned_count int;
  passed_count int;
  already_done timestamptz;
BEGIN
  IF NEW.passed IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT onboarding_completed_at INTO already_done
  FROM public.profiles WHERE user_id = NEW.user_id;

  IF already_done IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO assigned_count
  FROM public.get_user_assigned_sops(NEW.user_id);

  IF assigned_count = 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(DISTINCT qa.section_key) INTO passed_count
  FROM public.quiz_attempts qa
  WHERE qa.user_id = NEW.user_id
    AND qa.passed = true
    AND qa.section_key IN (
      SELECT s.system_key FROM public.get_user_assigned_sops(NEW.user_id) s WHERE s.system_key IS NOT NULL
      UNION
      SELECT s.sop_id::text FROM public.get_user_assigned_sops(NEW.user_id) s
    );

  IF passed_count >= assigned_count THEN
    UPDATE public.profiles
    SET onboarding_completed_at = now()
    WHERE user_id = NEW.user_id AND onboarding_completed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_onboarding_complete ON public.quiz_attempts;
CREATE TRIGGER trg_mark_onboarding_complete
AFTER INSERT ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.mark_onboarding_complete_if_done();
