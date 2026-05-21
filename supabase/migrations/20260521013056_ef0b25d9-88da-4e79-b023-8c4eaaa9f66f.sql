-- Phase 1: add quiz_score to canonical sop_acks, backfill from legacy sop_acknowledgments

ALTER TABLE public.sop_acks
  ADD COLUMN IF NOT EXISTS quiz_score integer;

COMMENT ON COLUMN public.sop_acks.quiz_score IS
  'Optional quiz score at time of acknowledgment, for audit trail. Source: quiz_attempts.score for the most recent passing attempt.';

-- Backfill: copy legacy sop_acknowledgments rows into sop_acks where the sop_key
-- resolves to a current sops row (via system_key). Use legacy sop_version as ack_epoch.
-- Skip rows that already exist (same user_id + sop_id + ack_epoch).
INSERT INTO public.sop_acks (
  user_id, sop_id, ack_epoch, acknowledged_at, ip_address, user_agent
)
SELECT
  legacy.user_id,
  s.id AS sop_id,
  legacy.sop_version AS ack_epoch,
  legacy.acknowledged_at,
  legacy.ip_address,
  legacy.user_agent
FROM public.sop_acknowledgments legacy
JOIN public.sops s ON s.system_key = legacy.sop_key
WHERE NOT EXISTS (
  SELECT 1 FROM public.sop_acks existing
  WHERE existing.user_id = legacy.user_id
    AND existing.sop_id = s.id
    AND existing.ack_epoch = legacy.sop_version
);