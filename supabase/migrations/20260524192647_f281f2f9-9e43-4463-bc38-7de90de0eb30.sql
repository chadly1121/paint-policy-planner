
CREATE TABLE IF NOT EXISTS public.sops_link_backfill_orphans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_row_id uuid NOT NULL,
  user_id uuid,
  drive_file_id text,
  reason text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sops_link_backfill_orphans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view backfill orphans" ON public.sops_link_backfill_orphans;
CREATE POLICY "Admins can view backfill orphans"
  ON public.sops_link_backfill_orphans
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.company_policies     ADD COLUMN IF NOT EXISTS sop_id uuid REFERENCES public.sops(id) ON DELETE CASCADE;
ALTER TABLE public.company_sops         ADD COLUMN IF NOT EXISTS sop_id uuid REFERENCES public.sops(id) ON DELETE CASCADE;
ALTER TABLE public.company_safety       ADD COLUMN IF NOT EXISTS sop_id uuid REFERENCES public.sops(id) ON DELETE CASCADE;
ALTER TABLE public.company_training     ADD COLUMN IF NOT EXISTS sop_id uuid REFERENCES public.sops(id) ON DELETE CASCADE;
ALTER TABLE public.company_disciplinary ADD COLUMN IF NOT EXISTS sop_id uuid REFERENCES public.sops(id) ON DELETE CASCADE;
ALTER TABLE public.company_forms        ADD COLUMN IF NOT EXISTS sop_id uuid REFERENCES public.sops(id) ON DELETE CASCADE;

DO $outer$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'company_policies','company_sops','company_safety',
    'company_training','company_disciplinary','company_forms'
  ];
  has_drive_col boolean;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=tbl AND column_name='drive_file_id'
    ) INTO has_drive_col;

    IF NOT has_drive_col THEN
      RAISE NOTICE 'skipping backfill for % (no drive_file_id column)', tbl;
      CONTINUE;
    END IF;

    EXECUTE format($f$
      UPDATE public.%1$I AS c
      SET sop_id = sub.sop_id
      FROM (
        SELECT c2.id AS row_id, s.id AS sop_id
        FROM public.%1$I c2
        JOIN public.org_users ou
          ON ou.user_id = c2.user_id AND ou.is_active = true
        JOIN public.sops s
          ON s.drive_file_id = c2.drive_file_id
         AND s.org_id = ou.org_id
        WHERE c2.sop_id IS NULL
          AND c2.drive_file_id IS NOT NULL
      ) AS sub
      WHERE c.id = sub.row_id
    $f$, tbl);

    EXECUTE format($f$
      INSERT INTO public.sops_link_backfill_orphans
        (source_table, source_row_id, user_id, drive_file_id, reason)
      SELECT %1$L, c.id, c.user_id, c.drive_file_id,
             'no_matching_sops_row_for_(org_id, drive_file_id)'
      FROM public.%1$I c
      WHERE c.sop_id IS NULL
        AND c.drive_file_id IS NOT NULL
    $f$, tbl);
  END LOOP;
END
$outer$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_policies_sop_id     ON public.company_policies     (sop_id) WHERE sop_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_sops_sop_id         ON public.company_sops         (sop_id) WHERE sop_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_safety_sop_id       ON public.company_safety       (sop_id) WHERE sop_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_training_sop_id     ON public.company_training     (sop_id) WHERE sop_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_disciplinary_sop_id ON public.company_disciplinary (sop_id) WHERE sop_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_forms_sop_id        ON public.company_forms        (sop_id) WHERE sop_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_company_sop_org_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sop_org_id uuid;
  v_user_org_id uuid;
BEGIN
  IF NEW.sop_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT org_id INTO v_sop_org_id FROM public.sops WHERE id = NEW.sop_id;
  IF v_sop_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT org_id INTO v_user_org_id
  FROM public.org_users
  WHERE user_id = NEW.user_id AND is_active = true
  LIMIT 1;

  IF v_user_org_id IS NULL OR v_user_org_id <> v_sop_org_id THEN
    RAISE EXCEPTION 'sop_id % belongs to org % but row user % is in org % (table %)',
      NEW.sop_id, v_sop_org_id, NEW.user_id, v_user_org_id, TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

DO $outer$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'company_policies','company_sops','company_safety',
    'company_training','company_disciplinary','company_forms'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_sop_org_match ON public.%I', tbl);
    EXECUTE format($f$
      CREATE CONSTRAINT TRIGGER trg_enforce_sop_org_match
      AFTER INSERT OR UPDATE OF sop_id, user_id ON public.%I
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_company_sop_org_match()
    $f$, tbl);
  END LOOP;
END
$outer$;

DO $outer$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'company_policies','company_sops','company_safety',
    'company_training','company_disciplinary','company_forms'
  ];
  v_total bigint; v_linked bigint; v_null bigint; v_orphans bigint;
BEGIN
  RAISE NOTICE '=== sop_id backfill audit ===';
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('SELECT count(*), count(sop_id), count(*) FILTER (WHERE sop_id IS NULL) FROM public.%I', tbl)
      INTO v_total, v_linked, v_null;
    SELECT count(*) INTO v_orphans
      FROM public.sops_link_backfill_orphans WHERE source_table = tbl;
    RAISE NOTICE '% — total=%, linked=%, null=%, orphans_logged=%',
      tbl, v_total, v_linked, v_null, v_orphans;
  END LOOP;
END
$outer$;
