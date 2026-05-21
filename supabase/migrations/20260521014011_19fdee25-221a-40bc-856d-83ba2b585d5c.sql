-- 1. company_forms table (mirrors company_sops shape)
CREATE TABLE IF NOT EXISTS public.company_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_form_key text NOT NULL,
  title text NOT NULL,
  content text,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  change_summary text,
  edited_by uuid,
  video_url text,
  drive_file_id text,
  drive_folder_id text,
  parsed_sections jsonb,
  doc_id_external text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their company forms"
  ON public.company_forms
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Users can view their company forms"
  ON public.company_forms
  FOR SELECT
  USING (auth.uid() = user_id);

-- Triggers: parsed_sections + version increment + updated_at
CREATE TRIGGER trg_refresh_parsed_sections
  BEFORE INSERT OR UPDATE ON public.company_forms
  FOR EACH ROW EXECUTE FUNCTION public.refresh_parsed_sections();

CREATE TRIGGER trg_increment_company_forms_version
  BEFORE UPDATE ON public.company_forms
  FOR EACH ROW EXECUTE FUNCTION public.increment_sop_version();

CREATE TRIGGER trg_company_forms_updated_at
  BEFORE UPDATE ON public.company_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add doc_id_external to all category tables + sops (for Drive-synced metadata)
ALTER TABLE public.company_policies     ADD COLUMN IF NOT EXISTS doc_id_external text;
ALTER TABLE public.company_sops         ADD COLUMN IF NOT EXISTS doc_id_external text;
ALTER TABLE public.company_safety       ADD COLUMN IF NOT EXISTS doc_id_external text;
ALTER TABLE public.company_training     ADD COLUMN IF NOT EXISTS doc_id_external text;
ALTER TABLE public.company_disciplinary ADD COLUMN IF NOT EXISTS doc_id_external text;
ALTER TABLE public.sops                 ADD COLUMN IF NOT EXISTS doc_id_external text;

CREATE INDEX IF NOT EXISTS idx_company_policies_doc_id_ext     ON public.company_policies(doc_id_external);
CREATE INDEX IF NOT EXISTS idx_company_sops_doc_id_ext         ON public.company_sops(doc_id_external);
CREATE INDEX IF NOT EXISTS idx_company_safety_doc_id_ext       ON public.company_safety(doc_id_external);
CREATE INDEX IF NOT EXISTS idx_company_training_doc_id_ext     ON public.company_training(doc_id_external);
CREATE INDEX IF NOT EXISTS idx_company_disciplinary_doc_id_ext ON public.company_disciplinary(doc_id_external);
CREATE INDEX IF NOT EXISTS idx_company_forms_doc_id_ext        ON public.company_forms(doc_id_external);
CREATE INDEX IF NOT EXISTS idx_sops_doc_id_ext                 ON public.sops(doc_id_external);
