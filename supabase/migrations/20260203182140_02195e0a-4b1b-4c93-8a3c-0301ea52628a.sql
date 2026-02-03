-- Create table to store video URLs for Drive-based documents
CREATE TABLE public.drive_file_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, drive_file_id)
);

-- Enable RLS
ALTER TABLE public.drive_file_metadata ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their org metadata"
ON public.drive_file_metadata
FOR SELECT
USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org admins can insert metadata"
ON public.drive_file_metadata
FOR INSERT
WITH CHECK (is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can update metadata"
ON public.drive_file_metadata
FOR UPDATE
USING (is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can delete metadata"
ON public.drive_file_metadata
FOR DELETE
USING (is_org_admin(auth.uid(), org_id));

-- Trigger for updated_at
CREATE TRIGGER update_drive_file_metadata_updated_at
BEFORE UPDATE ON public.drive_file_metadata
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();