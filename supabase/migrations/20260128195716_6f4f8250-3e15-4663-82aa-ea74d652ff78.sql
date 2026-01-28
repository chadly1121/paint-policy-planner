-- Add source_file_url column to sops table for storing original uploaded files
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS source_file_url text;

-- Create storage bucket for organization documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-documents', 'org-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for org-documents bucket
-- Allow authenticated users to upload to their org's folder
CREATE POLICY "Users can upload to their org folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'org-documents' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = ('org_' || get_user_org_id(auth.uid())::text)
);

-- Allow users to view files from their org
CREATE POLICY "Users can view their org documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'org-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = ('org_' || get_user_org_id(auth.uid())::text)
);

-- Allow org admins to delete files from their org
CREATE POLICY "Org admins can delete org documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'org-documents'
  AND auth.uid() IS NOT NULL
  AND is_org_admin(auth.uid(), get_user_org_id(auth.uid()))
  AND (storage.foldername(name))[1] = ('org_' || get_user_org_id(auth.uid())::text)
);