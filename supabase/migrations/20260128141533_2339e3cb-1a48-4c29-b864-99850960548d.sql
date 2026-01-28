-- Add avatar_url and bio to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create certificates table
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuing_authority TEXT,
  certificate_url TEXT,
  issue_date DATE,
  expiry_date DATE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create awards table
CREATE TABLE public.awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  awarded_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;

-- Certificates policies: Users can manage their own, org members can view all in org
CREATE POLICY "Users can manage their own certificates"
ON public.certificates FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Org members can view org certificates"
ON public.certificates FOR SELECT
USING (org_id = get_user_org_id(auth.uid()));

-- Awards policies: Users can manage their own, org members can view all in org
CREATE POLICY "Users can manage their own awards"
ON public.awards FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Org members can view org awards"
ON public.awards FOR SELECT
USING (org_id = get_user_org_id(auth.uid()));

-- Trigger to update updated_at on certificates
CREATE TRIGGER update_certificates_updated_at
BEFORE UPDATE ON public.certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for employee files (avatars, certificates, awards)
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-files', 'employee-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for employee files
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'employee-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (bucket_id = 'employee-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Org members can view employee files"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-files');