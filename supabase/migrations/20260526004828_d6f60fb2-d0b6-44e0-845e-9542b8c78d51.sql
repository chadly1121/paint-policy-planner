
-- Org invitations table
CREATE TABLE public.org_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'foreman', 'painter', 'office', 'other')),
  invitation_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by_user UUID,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  expired_notice_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

CREATE INDEX idx_org_invitations_token ON public.org_invitations(invitation_token)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX idx_org_invitations_org_pending ON public.org_invitations(org_id)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE UNIQUE INDEX idx_org_invitations_one_pending_per_email
  ON public.org_invitations(org_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage org invitations"
  ON public.org_invitations
  FOR ALL
  USING (is_org_admin(auth.uid(), org_id))
  WITH CHECK (is_org_admin(auth.uid(), org_id));

-- Daily expiry cron (04:00 UTC)
DO $$
BEGIN
  PERFORM cron.unschedule('expire-invitations-cron-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'expire-invitations-cron-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lajudxjxfinjnpfmwvbx.supabase.co/functions/v1/expire-invitations-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhanVkeGp4Zmluam5wZm13dmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTQ1NTQsImV4cCI6MjA4MjA3MDU1NH0.2RuOv3w34hOv2X0FYMIqf5_dCHc0O2P7O53etl-DGU0'
    ),
    body := jsonb_build_object('triggered_by', 'cron', 'triggered_at', now())
  );
  $$
);
