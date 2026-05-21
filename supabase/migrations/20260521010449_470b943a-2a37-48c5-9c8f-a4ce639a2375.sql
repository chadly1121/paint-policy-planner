CREATE OR REPLACE FUNCTION public.invalidate_quiz_cache_on_version_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_key text;
BEGIN
  IF NEW.version IS DISTINCT FROM OLD.version THEN
    source_key := CASE TG_TABLE_NAME
      WHEN 'company_policies'     THEN NEW.source_policy_key
      WHEN 'company_sops'         THEN NEW.source_sop_key
      WHEN 'company_safety'       THEN NEW.source_safety_key
      WHEN 'company_training'     THEN NEW.source_training_key
      WHEN 'company_disciplinary' THEN NEW.source_disciplinary_key
    END;

    IF source_key IS NOT NULL THEN
      DELETE FROM public.quiz_questions
      WHERE section_key LIKE source_key || '%';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invalidate_quiz_cache_policies ON public.company_policies;
CREATE TRIGGER invalidate_quiz_cache_policies
AFTER UPDATE OF version ON public.company_policies
FOR EACH ROW EXECUTE FUNCTION public.invalidate_quiz_cache_on_version_change();

DROP TRIGGER IF EXISTS invalidate_quiz_cache_sops ON public.company_sops;
CREATE TRIGGER invalidate_quiz_cache_sops
AFTER UPDATE OF version ON public.company_sops
FOR EACH ROW EXECUTE FUNCTION public.invalidate_quiz_cache_on_version_change();

DROP TRIGGER IF EXISTS invalidate_quiz_cache_safety ON public.company_safety;
CREATE TRIGGER invalidate_quiz_cache_safety
AFTER UPDATE OF version ON public.company_safety
FOR EACH ROW EXECUTE FUNCTION public.invalidate_quiz_cache_on_version_change();

DROP TRIGGER IF EXISTS invalidate_quiz_cache_training ON public.company_training;
CREATE TRIGGER invalidate_quiz_cache_training
AFTER UPDATE OF version ON public.company_training
FOR EACH ROW EXECUTE FUNCTION public.invalidate_quiz_cache_on_version_change();

DROP TRIGGER IF EXISTS invalidate_quiz_cache_disciplinary ON public.company_disciplinary;
CREATE TRIGGER invalidate_quiz_cache_disciplinary
AFTER UPDATE OF version ON public.company_disciplinary
FOR EACH ROW EXECUTE FUNCTION public.invalidate_quiz_cache_on_version_change();