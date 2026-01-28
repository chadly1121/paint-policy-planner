
-- Add branding columns to orgs table
ALTER TABLE public.orgs
ADD COLUMN logo_url text,
ADD COLUMN tagline text;

-- Create storage bucket for org branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-branding', 'org-branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their org's folder
CREATE POLICY "Org admins can upload branding"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'org-branding' 
  AND is_org_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Allow anyone to view org branding (public logos)
CREATE POLICY "Org branding is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-branding');

-- Allow org admins to update/delete their branding
CREATE POLICY "Org admins can update branding"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'org-branding'
  AND is_org_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Org admins can delete branding"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'org-branding'
  AND is_org_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);
