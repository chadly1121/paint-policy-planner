
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS cert_type TEXT;
CREATE INDEX IF NOT EXISTS idx_certificates_user_type ON public.certificates(user_id, cert_type) WHERE cert_type IS NOT NULL;

CREATE TABLE public.org_cert_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  cert_type TEXT NOT NULL,
  cert_display_name TEXT NOT NULL,
  description TEXT,
  required_for_roles TEXT[] NOT NULL CHECK (array_length(required_for_roles, 1) > 0),
  regulatory_reference TEXT,
  renewal_interval_months INTEGER,
  notice_period_days INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (org_id, cert_type)
);
CREATE INDEX idx_org_cert_requirements_org ON public.org_cert_requirements(org_id) WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_cert_requirements TO authenticated;
GRANT ALL ON public.org_cert_requirements TO service_role;

ALTER TABLE public.org_cert_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view their requirements" ON public.org_cert_requirements
  FOR SELECT TO authenticated USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins manage cert requirements" ON public.org_cert_requirements
  FOR ALL TO authenticated USING (public.is_org_admin(auth.uid(), org_id))
  WITH CHECK (public.is_org_admin(auth.uid(), org_id));

CREATE TRIGGER update_org_cert_requirements_updated_at
  BEFORE UPDATE ON public.org_cert_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- cert_compliance_notices (week_bucket set by trigger or job to allow unique constraint)
CREATE TABLE public.cert_compliance_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  cert_type TEXT NOT NULL,
  status_at_notice TEXT NOT NULL,
  notice_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  week_bucket DATE NOT NULL DEFAULT (date_trunc('week', now() AT TIME ZONE 'UTC'))::date,
  UNIQUE (user_id, cert_type, status_at_notice, week_bucket)
);
CREATE INDEX idx_cert_notices_org ON public.cert_compliance_notices(org_id);

GRANT SELECT ON public.cert_compliance_notices TO authenticated;
GRANT ALL ON public.cert_compliance_notices TO service_role;

ALTER TABLE public.cert_compliance_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notices" ON public.cert_compliance_notices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Org admins view org notices" ON public.cert_compliance_notices
  FOR SELECT TO authenticated USING (public.is_org_admin(auth.uid(), org_id));

CREATE OR REPLACE FUNCTION public.get_user_cert_compliance(_user_id uuid, _org_id uuid)
RETURNS TABLE (
  cert_type text,
  cert_display_name text,
  description text,
  regulatory_reference text,
  status text,
  latest_cert_id uuid,
  expiry_date date,
  days_until_expiry int,
  renewal_interval_months int,
  notice_period_days int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM org_users
  WHERE user_id = _user_id AND org_id = _org_id AND is_active = true LIMIT 1;

  IF v_role IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    r.cert_type,
    r.cert_display_name,
    r.description,
    r.regulatory_reference,
    CASE
      WHEN latest.id IS NULL THEN 'missing'
      WHEN latest.expiry_date IS NULL THEN 'no_expiry'
      WHEN latest.expiry_date < CURRENT_DATE THEN 'expired'
      WHEN latest.expiry_date - CURRENT_DATE <= r.notice_period_days THEN 'expiring_soon'
      ELSE 'valid'
    END AS status,
    latest.id AS latest_cert_id,
    latest.expiry_date,
    CASE WHEN latest.expiry_date IS NOT NULL THEN (latest.expiry_date - CURRENT_DATE)::int ELSE NULL END AS days_until_expiry,
    r.renewal_interval_months,
    r.notice_period_days
  FROM org_cert_requirements r
  LEFT JOIN LATERAL (
    SELECT c.id, c.expiry_date FROM certificates c
    WHERE c.user_id = _user_id AND c.cert_type = r.cert_type
    ORDER BY COALESCE(c.expiry_date, '9999-12-31'::date) DESC, c.created_at DESC
    LIMIT 1
  ) latest ON true
  WHERE r.org_id = _org_id
    AND r.is_active = true
    AND v_role = ANY(r.required_for_roles)
  ORDER BY
    CASE
      WHEN latest.id IS NULL THEN 1
      WHEN latest.expiry_date < CURRENT_DATE THEN 2
      WHEN latest.expiry_date - CURRENT_DATE <= r.notice_period_days THEN 3
      ELSE 4
    END,
    r.cert_display_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_cert_compliant(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.get_user_cert_compliance(_user_id, _org_id)
    WHERE status IN ('missing', 'expired')
  );
$$;

INSERT INTO public.org_cert_requirements
  (org_id, cert_type, cert_display_name, description, required_for_roles, regulatory_reference, renewal_interval_months, notice_period_days)
SELECT o.id, x.cert_type, x.cert_display_name, x.description, x.required_for_roles, x.regulatory_reference, x.renewal_interval_months, x.notice_period_days
FROM public.orgs o
CROSS JOIN (
  VALUES
    ('worker_awareness', 'Worker Health and Safety Awareness', 'Ontario-mandated awareness training. One-time, no renewal.', ARRAY['painter','foreman','office','other']::text[], 'O. Reg. 297/13', NULL::int, 30),
    ('supervisor_awareness', 'Supervisor Health and Safety Awareness', 'Ontario-mandated supervisor awareness. Required for foremen.', ARRAY['foreman']::text[], 'O. Reg. 297/13', NULL::int, 30),
    ('working_at_heights', 'Working at Heights', 'CPO-approved Working at Heights training. 3-year refresher required.', ARRAY['painter','foreman']::text[], 'O. Reg. 297/13 + O. Reg. 213/91', 36, 90),
    ('whmis_2015', 'WHMIS 2015', 'Workplace Hazardous Materials Information System. Required for all workers exposed to hazardous products. Annual refresher recommended.', ARRAY['painter','foreman','office']::text[], 'Hazardous Products Regulations + OHSA', 12, 60),
    ('standard_first_aid_cpr', 'Standard First Aid + CPR-C', 'At least one trained first aider per shift required when 5+ workers on site.', ARRAY['foreman']::text[], 'WSIB Regulation 1101', 36, 90)
) AS x(cert_type, cert_display_name, description, required_for_roles, regulatory_reference, renewal_interval_months, notice_period_days)
ON CONFLICT (org_id, cert_type) DO NOTHING;

CREATE OR REPLACE FUNCTION public.seed_default_cert_requirements()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.org_cert_requirements
    (org_id, cert_type, cert_display_name, description, required_for_roles, regulatory_reference, renewal_interval_months, notice_period_days)
  VALUES
    (NEW.id, 'worker_awareness', 'Worker Health and Safety Awareness', 'Ontario-mandated awareness training. One-time, no renewal.', ARRAY['painter','foreman','office','other'], 'O. Reg. 297/13', NULL, 30),
    (NEW.id, 'supervisor_awareness', 'Supervisor Health and Safety Awareness', 'Ontario-mandated supervisor awareness. Required for foremen.', ARRAY['foreman'], 'O. Reg. 297/13', NULL, 30),
    (NEW.id, 'working_at_heights', 'Working at Heights', 'CPO-approved Working at Heights training. 3-year refresher required.', ARRAY['painter','foreman'], 'O. Reg. 297/13 + O. Reg. 213/91', 36, 90),
    (NEW.id, 'whmis_2015', 'WHMIS 2015', 'Workplace Hazardous Materials Information System. Required for all workers exposed to hazardous products. Annual refresher recommended.', ARRAY['painter','foreman','office'], 'Hazardous Products Regulations + OHSA', 12, 60),
    (NEW.id, 'standard_first_aid_cpr', 'Standard First Aid + CPR-C', 'At least one trained first aider per shift required when 5+ workers on site.', ARRAY['foreman'], 'WSIB Regulation 1101', 36, 90)
  ON CONFLICT (org_id, cert_type) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_org_cert_requirements_after_insert
  AFTER INSERT ON public.orgs
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_cert_requirements();
