-- Create table for org AI settings (OpenAI API keys)
CREATE TABLE public.org_ai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'openai',
  api_key_encrypted TEXT NOT NULL,
  api_key_hint TEXT, -- Last 4 chars for display
  is_active BOOLEAN DEFAULT true,
  connected_by UUID REFERENCES auth.users(id),
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  last_test_at TIMESTAMP WITH TIME ZONE,
  last_test_success BOOLEAN,
  requests_this_month INTEGER DEFAULT 0,
  requests_month_start DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, provider)
);

-- Enable RLS
ALTER TABLE public.org_ai_settings ENABLE ROW LEVEL SECURITY;

-- Only org admins can view their org's AI settings
CREATE POLICY "Org admins can view AI settings"
ON public.org_ai_settings
FOR SELECT
USING (is_org_admin(auth.uid(), org_id));

-- Only org admins can insert AI settings
CREATE POLICY "Org admins can insert AI settings"
ON public.org_ai_settings
FOR INSERT
WITH CHECK (is_org_admin(auth.uid(), org_id));

-- Only org admins can update AI settings
CREATE POLICY "Org admins can update AI settings"
ON public.org_ai_settings
FOR UPDATE
USING (is_org_admin(auth.uid(), org_id));

-- Only org admins can delete AI settings
CREATE POLICY "Org admins can delete AI settings"
ON public.org_ai_settings
FOR DELETE
USING (is_org_admin(auth.uid(), org_id));

-- Create trigger for updated_at
CREATE TRIGGER update_org_ai_settings_updated_at
BEFORE UPDATE ON public.org_ai_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to check if org has AI enabled (for non-admin access)
CREATE OR REPLACE FUNCTION public.org_has_ai_enabled(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_ai_settings
    WHERE org_id = _org_id
      AND is_active = true
      AND api_key_encrypted IS NOT NULL
  )
$$;