-- Create table to store disclaimer acceptances with versioning
CREATE TABLE public.disclaimer_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  disclaimer_version TEXT NOT NULL DEFAULT 'v1.0',
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable Row Level Security
ALTER TABLE public.disclaimer_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptances
CREATE POLICY "Users can view their own disclaimer acceptances"
ON public.disclaimer_acceptances
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own acceptances
CREATE POLICY "Users can insert their own disclaimer acceptance"
ON public.disclaimer_acceptances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all acceptances
CREATE POLICY "Admins can view all disclaimer acceptances"
ON public.disclaimer_acceptances
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_disclaimer_acceptances_user_id ON public.disclaimer_acceptances(user_id);