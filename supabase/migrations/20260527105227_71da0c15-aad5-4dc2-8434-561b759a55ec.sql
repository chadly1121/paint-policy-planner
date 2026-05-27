DO $$
BEGIN
  PERFORM cron.unschedule('cert-compliance-check-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'cert-compliance-check-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lajudxjxfinjnpfmwvbx.supabase.co/functions/v1/cert-compliance-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhanVkeGp4Zmluam5wZm13dmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTQ1NTQsImV4cCI6MjA4MjA3MDU1NH0.2RuOv3w34hOv2X0FYMIqf5_dCHc0O2P7O53etl-DGU0'
    ),
    body := jsonb_build_object('triggered_by', 'cron', 'triggered_at', now())
  );
  $$
);