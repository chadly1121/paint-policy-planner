-- Add preferred_language column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN preferred_language text NOT NULL DEFAULT 'en';

-- Add constraint to ensure valid language codes
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_language_code 
CHECK (preferred_language IN ('en', 'fr', 'es', 'tl'));