
-- 1. Ensure required columns exist on canonical sop_acks
ALTER TABLE public.sop_acks ADD COLUMN IF NOT EXISTS document_version integer;
ALTER TABLE public.sop_acks ADD COLUMN IF NOT EXISTS org_id uuid;

CREATE INDEX IF NOT EXISTS idx_sop_acks_user_sop_version
  ON public.sop_acks(user_id, sop_id, document_version);
CREATE INDEX IF NOT EXISTS idx_sop_acks_org_id ON public.sop_acks(org_id);

-- 2. Orphan capture table (mirrors legacy schema + reason)
CREATE TABLE IF NOT EXISTS public.sop_acks_migration_orphans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid,
  user_id uuid,
  sop_key text,
  sop_version integer,
  acknowledged_at timestamptz,
  ip_address text,
  user_agent text,
  reason text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sop_acks_migration_orphans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view orphans" ON public.sop_acks_migration_orphans;
CREATE POLICY "Admins can view orphans"
  ON public.sop_acks_migration_orphans FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Migration function: idempotent, returns a single-row report
CREATE OR REPLACE FUNCTION public.migrate_sop_acknowledgments_to_sop_acks()
RETURNS TABLE(total_source bigint, migrated bigint, skipped_duplicate bigint, orphaned bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total bigint := 0;
  v_migrated bigint := 0;
  v_skipped bigint := 0;
  v_orphaned bigint := 0;
  r record;
  v_sop_id uuid;
  v_sop_org_id uuid;
  v_resolved_org_id uuid;
  v_exists boolean;
BEGIN
  SELECT count(*) INTO v_total FROM public.sop_acknowledgments;

  FOR r IN SELECT * FROM public.sop_acknowledgments LOOP
    SELECT id, org_id INTO v_sop_id, v_sop_org_id
    FROM public.sops
    WHERE system_key = r.sop_key
    ORDER BY (org_id IS NULL) DESC -- prefer system row when ambiguous
    LIMIT 1;

    IF v_sop_id IS NULL THEN
      -- Skip if already captured as orphan (idempotency)
      IF NOT EXISTS (
        SELECT 1 FROM public.sop_acks_migration_orphans
        WHERE source_id = r.id
      ) THEN
        INSERT INTO public.sop_acks_migration_orphans(
          source_id, user_id, sop_key, sop_version, acknowledged_at,
          ip_address, user_agent, reason
        ) VALUES (
          r.id, r.user_id, r.sop_key, r.sop_version, r.acknowledged_at,
          r.ip_address, r.user_agent,
          'no_matching_sop_for_sop_key'
        );
      END IF;
      v_orphaned := v_orphaned + 1;
      CONTINUE;
    END IF;

    -- Dedup by (user_id, sop_id, document_version)
    SELECT EXISTS (
      SELECT 1 FROM public.sop_acks
      WHERE user_id = r.user_id
        AND sop_id = v_sop_id
        AND COALESCE(document_version, ack_epoch) = COALESCE(r.sop_version, 1)
    ) INTO v_exists;

    IF v_exists THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Derive org_id: prefer SOP's org_id, else user's active org
    v_resolved_org_id := v_sop_org_id;
    IF v_resolved_org_id IS NULL THEN
      SELECT org_id INTO v_resolved_org_id
      FROM public.org_users
      WHERE user_id = r.user_id AND is_active = true
      LIMIT 1;
    END IF;

    INSERT INTO public.sop_acks(
      user_id, sop_id, ack_epoch, document_version,
      acknowledged_at, ip_address, user_agent, org_id
    ) VALUES (
      r.user_id, v_sop_id,
      COALESCE(r.sop_version, 1),
      COALESCE(r.sop_version, 1),
      r.acknowledged_at, r.ip_address, r.user_agent, v_resolved_org_id
    );
    v_migrated := v_migrated + 1;
  END LOOP;

  RAISE NOTICE 'sop_acks migration report: total=%, migrated=%, skipped_duplicate=%, orphaned=%',
    v_total, v_migrated, v_skipped, v_orphaned;

  total_source := v_total;
  migrated := v_migrated;
  skipped_duplicate := v_skipped;
  orphaned := v_orphaned;
  RETURN NEXT;
END;
$function$;

-- 4. Run it now and surface counts via NOTICE
DO $$
DECLARE
  rpt record;
BEGIN
  SELECT * INTO rpt FROM public.migrate_sop_acknowledgments_to_sop_acks();
  RAISE NOTICE '=== Phase 1 sop_acks migration ===';
  RAISE NOTICE 'total source rows : %', rpt.total_source;
  RAISE NOTICE 'rows migrated     : %', rpt.migrated;
  RAISE NOTICE 'skipped duplicates: %', rpt.skipped_duplicate;
  RAISE NOTICE 'orphaned          : %', rpt.orphaned;
  IF rpt.orphaned > 0 THEN
    RAISE WARNING '% legacy acknowledgments could not be mapped to a SOP. See public.sop_acks_migration_orphans.', rpt.orphaned;
  END IF;
END $$;

-- 5. Deprecation tripwire on legacy table
CREATE OR REPLACE FUNCTION public.warn_sop_acknowledgments_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE WARNING 'DEPRECATED: insert into public.sop_acknowledgments by user=% sop_key=% — write to public.sop_acks instead.',
    NEW.user_id, NEW.sop_key;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_warn_sop_acknowledgments_insert ON public.sop_acknowledgments;
CREATE TRIGGER trg_warn_sop_acknowledgments_insert
BEFORE INSERT ON public.sop_acknowledgments
FOR EACH ROW EXECUTE FUNCTION public.warn_sop_acknowledgments_insert();
