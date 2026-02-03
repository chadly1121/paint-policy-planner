-- Create incident_reports table
CREATE TABLE public.incident_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  incident_date DATE NOT NULL,
  incident_time TIME,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  injuries_reported BOOLEAN DEFAULT false,
  injury_details TEXT,
  witnesses TEXT,
  immediate_actions TEXT,
  root_cause TEXT,
  corrective_actions TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  severity TEXT NOT NULL DEFAULT 'minor',
  drive_file_id TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT
);

-- Add indexes
CREATE INDEX idx_incident_reports_org_id ON public.incident_reports(org_id);
CREATE INDEX idx_incident_reports_status ON public.incident_reports(status);
CREATE INDEX idx_incident_reports_incident_date ON public.incident_reports(incident_date);

-- Enable RLS
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their org incident reports"
ON public.incident_reports
FOR SELECT
USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can create incident reports in their org"
ON public.incident_reports
FOR INSERT
WITH CHECK (org_id = get_user_org_id(auth.uid()) AND reported_by = auth.uid());

CREATE POLICY "Org admins can update incident reports"
ON public.incident_reports
FOR UPDATE
USING (is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can delete incident reports"
ON public.incident_reports
FOR DELETE
USING (is_org_admin(auth.uid(), org_id));

-- Trigger for updated_at
CREATE TRIGGER update_incident_reports_updated_at
BEFORE UPDATE ON public.incident_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();