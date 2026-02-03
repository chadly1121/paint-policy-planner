-- Create SDS documents table
CREATE TABLE public.sds_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.org_users(id),
  updated_by UUID REFERENCES public.org_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Document info
  product_name TEXT NOT NULL,
  manufacturer TEXT,
  hazard_category TEXT, -- e.g., 'flammable', 'corrosive', 'toxic', 'irritant', 'oxidizer', 'compressed_gas', 'health_hazard', 'environmental'
  
  -- Storage options (supports both Drive and external links)
  drive_file_id TEXT,
  external_url TEXT,
  
  -- Metadata
  revision_date DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.sds_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their org SDS documents"
  ON public.sds_documents
  FOR SELECT
  USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org admins can insert SDS documents"
  ON public.sds_documents
  FOR INSERT
  WITH CHECK (is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can update SDS documents"
  ON public.sds_documents
  FOR UPDATE
  USING (is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can delete SDS documents"
  ON public.sds_documents
  FOR DELETE
  USING (is_org_admin(auth.uid(), org_id));

-- Update timestamp trigger
CREATE TRIGGER update_sds_documents_updated_at
  BEFORE UPDATE ON public.sds_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for search performance
CREATE INDEX idx_sds_documents_org_id ON public.sds_documents(org_id);
CREATE INDEX idx_sds_documents_product_name ON public.sds_documents USING gin(to_tsvector('english', product_name));
CREATE INDEX idx_sds_documents_manufacturer ON public.sds_documents USING gin(to_tsvector('english', COALESCE(manufacturer, '')));
CREATE INDEX idx_sds_documents_hazard ON public.sds_documents(hazard_category);