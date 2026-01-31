-- Add tenant-level notification settings
CREATE TABLE public.org_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  cert_reminder_days_first integer NOT NULL DEFAULT 30,
  cert_reminder_days_urgent integer NOT NULL DEFAULT 14,
  cert_reminder_frequency_days integer NOT NULL DEFAULT 7,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

-- Enable RLS
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

-- Org members can view their org settings
CREATE POLICY "Users can view their org settings"
ON public.org_settings
FOR SELECT
USING (org_id = get_user_org_id(auth.uid()));

-- Only org admins can manage settings
CREATE POLICY "Org admins can manage settings"
ON public.org_settings
FOR ALL
USING (is_org_admin(auth.uid(), org_id))
WITH CHECK (is_org_admin(auth.uid(), org_id));

-- Add updated_at trigger
CREATE TRIGGER update_org_settings_updated_at
  BEFORE UPDATE ON public.org_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.org_settings IS 'Per-tenant configuration settings including notification timing';