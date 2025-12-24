-- Company settings table for admin toggles
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enable_custom_sops boolean NOT NULL DEFAULT false,
  enable_custom_policies boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Company SOPs (forked from system SOPs)
CREATE TABLE public.company_sops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_sop_key text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_sop_key)
);

-- Company policies (forked from system policies)
CREATE TABLE public.company_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_policy_key text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_policy_key)
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_policies ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_settings (admins only)
CREATE POLICY "Admins can view their company settings"
ON public.company_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Admins can insert their company settings"
ON public.company_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Admins can update their company settings"
ON public.company_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

-- RLS policies for company_sops
CREATE POLICY "Admins can manage their company SOPs"
ON public.company_sops FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Users can view their company SOPs"
ON public.company_sops FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for company_policies
CREATE POLICY "Admins can manage their company policies"
ON public.company_policies FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Users can view their company policies"
ON public.company_policies FOR SELECT
USING (auth.uid() = user_id);

-- Update triggers
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_sops_updated_at
BEFORE UPDATE ON public.company_sops
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_policies_updated_at
BEFORE UPDATE ON public.company_policies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();