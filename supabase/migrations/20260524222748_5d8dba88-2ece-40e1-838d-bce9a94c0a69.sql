-- Source-control drive-sync-cron-daily schedule (already live; this makes it reproducible)
DO $$
BEGIN
  PERFORM cron.unschedule('drive-sync-cron-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'drive-sync-cron-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lajudxjxfinjnpfmwvbx.supabase.co/functions/v1/drive-sync-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhanVkeGp4Zmluam5wZm13dmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTQ1NTQsImV4cCI6MjA4MjA3MDU1NH0.2RuOv3w34hOv2X0FYMIqf5_dCHc0O2P7O53etl-DGU0'
    ),
    body := jsonb_build_object('triggered_by', 'cron', 'triggered_at', now())
  );
  $$
);