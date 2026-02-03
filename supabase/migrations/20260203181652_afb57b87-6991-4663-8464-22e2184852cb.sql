-- Add video_url column to all document tables that don't have it yet

ALTER TABLE public.company_policies 
ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.company_safety 
ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.company_training 
ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.company_disciplinary 
ADD COLUMN IF NOT EXISTS video_url text;