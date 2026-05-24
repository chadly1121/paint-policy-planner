-- Ensure required extensions are present
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotently unschedule any prior versions, then re-create each schedule.
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN
    SELECT jobid FROM cron.job
    WHERE jobname IN ('grant-awards-daily', 'reack-notifier-daily', 'reack-monthly-digest')
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
END $$;

-- Daily awards grant check — 03:00 UTC
SELECT cron.schedule(
  'grant-awards-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lajudxjxfinjnpfmwvbx.supabase.co/functions/v1/grant-awards',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhanVkeGp4Zmluam5wZm13dmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTQ1NTQsImV4cCI6MjA4MjA3MDU1NH0.2RuOv3w34hOv2X0FYMIqf5_dCHc0O2P7O53etl-DGU0'
    ),
    body := jsonb_build_object('triggered_by', 'cron', 'triggered_at', now())
  );
  $$
);

-- Daily re-acknowledgement notifier — 08:00 UTC (≈ 04:00 ET)
SELECT cron.schedule(
  'reack-notifier-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lajudxjxfinjnpfmwvbx.supabase.co/functions/v1/reack-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhanVkeGp4Zmluam5wZm13dmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTQ1NTQsImV4cCI6MjA4MjA3MDU1NH0.2RuOv3w34hOv2X0FYMIqf5_dCHc0O2P7O53etl-DGU0'
    ),
    body := jsonb_build_object('triggered_by', 'cron', 'triggered_at', now())
  );
  $$
);

-- Monthly re-acknowledgement digest — 08:00 UTC on the 1st of each month
SELECT cron.schedule(
  'reack-monthly-digest',
  '0 8 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://lajudxjxfinjnpfmwvbx.supabase.co/functions/v1/reack-monthly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhanVkeGp4Zmluam5wZm13dmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTQ1NTQsImV4cCI6MjA4MjA3MDU1NH0.2RuOv3w34hOv2X0FYMIqf5_dCHc0O2P7O53etl-DGU0'
    ),
    body := jsonb_build_object('triggered_by', 'cron', 'triggered_at', now())
  );
  $$
);