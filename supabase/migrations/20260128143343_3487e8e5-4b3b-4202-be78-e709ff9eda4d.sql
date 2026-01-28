-- Add new settings flags to company_settings
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS enable_custom_training boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_custom_safety boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_custom_disciplinary boolean NOT NULL DEFAULT false;

-- Create company_training table
CREATE TABLE IF NOT EXISTS public.company_training (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_training_key text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  edited_by uuid,
  change_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create company_safety table
CREATE TABLE IF NOT EXISTS public.company_safety (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_safety_key text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  edited_by uuid,
  change_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create company_disciplinary table
CREATE TABLE IF NOT EXISTS public.company_disciplinary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_disciplinary_key text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  edited_by uuid,
  change_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_safety ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_disciplinary ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_training
CREATE POLICY "Admins can manage their company training"
ON public.company_training FOR ALL
USING (has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

CREATE POLICY "Users can view their company training"
ON public.company_training FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for company_safety
CREATE POLICY "Admins can manage their company safety"
ON public.company_safety FOR ALL
USING (has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

CREATE POLICY "Users can view their company safety"
ON public.company_safety FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for company_disciplinary
CREATE POLICY "Admins can manage their company disciplinary"
ON public.company_disciplinary FOR ALL
USING (has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

CREATE POLICY "Users can view their company disciplinary"
ON public.company_disciplinary FOR SELECT
USING (auth.uid() = user_id);

-- Version increment triggers
CREATE TRIGGER increment_training_version
BEFORE UPDATE ON public.company_training
FOR EACH ROW
EXECUTE FUNCTION increment_policy_version();

CREATE TRIGGER increment_safety_version
BEFORE UPDATE ON public.company_safety
FOR EACH ROW
EXECUTE FUNCTION increment_policy_version();

CREATE TRIGGER increment_disciplinary_version
BEFORE UPDATE ON public.company_disciplinary
FOR EACH ROW
EXECUTE FUNCTION increment_policy_version();

-- Updated_at triggers
CREATE TRIGGER update_company_training_updated_at
BEFORE UPDATE ON public.company_training
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_safety_updated_at
BEFORE UPDATE ON public.company_safety
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_disciplinary_updated_at
BEFORE UPDATE ON public.company_disciplinary
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();