-- PHASE 2: Drop the deprecated sop_acknowledgments table.
--
-- DO NOT APPLY UNTIL:
--   1. Phase 1 (add quiz_score + backfill into sop_acks) has been live for ~1 week in dev
--   2. You've confirmed no app code still references sop_acknowledgments
--      (rg -n "sop_acknowledgments" src/ supabase/  -> should return 0 hits)
--   3. Spot-checked sop_acks contains the historical rows you care about
--
-- To apply: paste this SQL into the migration tool and run it.

-- Final safety check: list any rows that did NOT migrate (sop_key didn't resolve to a sops.system_key).
-- If this returns rows you care about, investigate before dropping.
--   SELECT a.* FROM public.sop_acknowledgments a
--   LEFT JOIN public.sops s ON s.system_key = a.sop_key
--   WHERE s.id IS NULL;

DROP TABLE IF EXISTS public.sop_acknowledgments CASCADE;
