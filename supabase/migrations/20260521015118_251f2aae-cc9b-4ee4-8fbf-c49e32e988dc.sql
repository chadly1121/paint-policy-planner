
ALTER TABLE public.sops                 ADD COLUMN IF NOT EXISTS drive_modified_time timestamptz;
ALTER TABLE public.company_policies     ADD COLUMN IF NOT EXISTS drive_modified_time timestamptz;
ALTER TABLE public.company_sops         ADD COLUMN IF NOT EXISTS drive_modified_time timestamptz;
ALTER TABLE public.company_safety       ADD COLUMN IF NOT EXISTS drive_modified_time timestamptz;
ALTER TABLE public.company_training     ADD COLUMN IF NOT EXISTS drive_modified_time timestamptz;
ALTER TABLE public.company_disciplinary ADD COLUMN IF NOT EXISTS drive_modified_time timestamptz;
ALTER TABLE public.company_forms        ADD COLUMN IF NOT EXISTS drive_modified_time timestamptz;

CREATE OR REPLACE FUNCTION public.invalidate_quiz_cache_on_drive_modified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  source_key text;
BEGIN
  IF NEW.drive_modified_time IS DISTINCT FROM OLD.drive_modified_time THEN
    source_key := CASE TG_TABLE_NAME
      WHEN 'company_policies'     THEN NEW.source_policy_key
      WHEN 'company_sops'         THEN NEW.source_sop_key
      WHEN 'company_safety'       THEN NEW.source_safety_key
      WHEN 'company_training'     THEN NEW.source_training_key
      WHEN 'company_disciplinary' THEN NEW.source_disciplinary_key
      WHEN 'company_forms'        THEN NEW.source_form_key
      WHEN 'sops'                 THEN COALESCE(NEW.system_key, NEW.id::text)
    END;

    IF source_key IS NOT NULL THEN
      DELETE FROM public.quiz_questions
      WHERE section_key LIKE source_key || '%';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_invalidate_quiz_cache_drive_modified ON public.company_policies;
CREATE TRIGGER trg_invalidate_quiz_cache_drive_modified AFTER UPDATE OF drive_modified_time ON public.company_policies FOR EACH ROW EXECUTE FUNCTION public.invalidate_quiz_cache_on_drive_modified();

DROP TRIGGER IF EXISTS trg_invalidate_quiz_cache_drive_modified ON public.company_sops;
CREATE TRIGGER trg_invalidate_quiz_cache_drive_modified AFTER UPDATE OF drive_modified_time ON public.company_sops FOR EACH ROW EXECUTE FUNCTION public.invalidate_quiz_cache_on_drive_modified();

DROP TRIGGER IF EXISTS trg_invalidate_quiz_cache_drive_modified ON public.company_safety;
CREATE TRIGGER trg_invalidate_quiz_cache_drive_modified AFTER UPDATE OF drive_modified_time ON public.company_safety FOR EACH ROW EXECUTE FUNCTION public.invalidate_quiz_cache_on_drive_modified();

DROP TRIGGER IF EXISTS trg_invalidate_quiz_cache_drive_modified ON public.company_training;
CREATE TRIGGER trg_invalidate_quiz_cache_drive_modified AFTER UPDATE OF drive_modified_time ON public.company_training FOR EACH ROW EXECUTE FUNCTION public.invalidate_quiz_cache_on_drive_modified();

DROP TRIGGER IF EXISTS trg_invalidate_quiz_cache_drive_modified ON public.company_disciplinary;
CREATE TRIGGER trg_invalidate_quiz_cache_drive_modified AFTER UPDATE OF drive_modified_time ON public.company_disciplinary FOR EACH ROW EXECUTE FUNCTION public.invalidate_quiz_cache_on_drive_modified();

DROP TRIGGER IF EXISTS trg_invalidate_quiz_cache_drive_modified ON public.company_forms;
CREATE TRIGGER trg_invalidate_quiz_cache_drive_modified AFTER UPDATE OF drive_modified_time ON public.company_forms FOR EACH ROW EXECUTE FUNCTION public.invalidate_quiz_cache_on_drive_modified();

DROP TRIGGER IF EXISTS trg_invalidate_quiz_cache_drive_modified ON public.sops;
CREATE TRIGGER trg_invalidate_quiz_cache_drive_modified AFTER UPDATE OF drive_modified_time ON public.sops FOR EACH ROW EXECUTE FUNCTION public.invalidate_quiz_cache_on_drive_modified();

CREATE INDEX IF NOT EXISTS idx_company_policies_drive_file_id     ON public.company_policies(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_company_safety_drive_file_id       ON public.company_safety(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_company_training_drive_file_id     ON public.company_training(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_company_disciplinary_drive_file_id ON public.company_disciplinary(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_company_forms_drive_file_id        ON public.company_forms(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_sops_drive_file_id                 ON public.sops(drive_file_id);
