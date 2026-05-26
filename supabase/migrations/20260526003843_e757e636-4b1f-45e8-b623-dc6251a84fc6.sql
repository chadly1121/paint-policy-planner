
-- Attachments table
CREATE TABLE public.incident_report_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  drive_file_id TEXT NOT NULL,
  drive_web_view_link TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  CONSTRAINT incident_attachments_size_check CHECK (size_bytes <= 25 * 1024 * 1024)
);

CREATE INDEX idx_incident_attachments_incident_id ON public.incident_report_attachments(incident_id);

ALTER TABLE public.incident_report_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments in their org"
  ON public.incident_report_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.incident_reports ir
      WHERE ir.id = incident_id
        AND ir.org_id = get_user_org_id(auth.uid())
    )
  );

CREATE POLICY "Users can upload attachments to their org incidents"
  ON public.incident_report_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.incident_reports ir
      WHERE ir.id = incident_id
        AND ir.org_id = get_user_org_id(auth.uid())
    )
  );

CREATE POLICY "Org admins can delete attachments"
  ON public.incident_report_attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.incident_reports ir
      WHERE ir.id = incident_id
        AND is_org_admin(auth.uid(), ir.org_id)
    )
  );

-- Normalize any legacy values before adding CHECK constraints (table is currently empty,
-- but be defensive in case rows arrive between planning and applying the migration).
UPDATE public.incident_reports
  SET severity = 'severe'
  WHERE severity = 'major';
UPDATE public.incident_reports
  SET severity = 'minor'
  WHERE severity IS NULL OR severity NOT IN ('minor','moderate','severe','critical');
UPDATE public.incident_reports
  SET status = 'in_review'
  WHERE status IN ('investigating','resolved');
UPDATE public.incident_reports
  SET status = 'open'
  WHERE status IS NULL OR status NOT IN ('open','in_review','closed');

ALTER TABLE public.incident_reports
  ADD CONSTRAINT incident_reports_severity_check
  CHECK (severity IN ('minor','moderate','severe','critical'));

ALTER TABLE public.incident_reports
  ADD CONSTRAINT incident_reports_status_check
  CHECK (status IN ('open','in_review','closed'));
