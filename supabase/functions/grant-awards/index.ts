// grant-awards: daily scheduled job. Evaluates 5 achievement awards per org member
// and inserts new ones into public.awards (auto_granted=true). Sends a notification
// for each newly granted award via the send-notification function.
//
// Idempotent: NOT EXISTS guards prevent re-granting one-shot awards. Repeatable
// awards (Safety Streak, Hazard Spotter) are gated on awarded_date windows.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type AwardCode =
  | "ONBOARDING_COMPLETE"
  | "SAFETY_STREAK_30"
  | "HAZARD_SPOTTER"
  | "REFRESHER_CHAMPION"
  | "POLYGLOT";

const AWARD_META: Record<AwardCode, { title: string; description: string }> = {
  ONBOARDING_COMPLETE: {
    title: "Onboarding Complete",
    description: "Finished your full onboarding sequence. Welcome aboard!",
  },
  SAFETY_STREAK_30: {
    title: "30-Day Safety Streak",
    description: "30 consecutive days with no incidents filed in your org. Nice work.",
  },
  HAZARD_SPOTTER: {
    title: "Hazard Spotter",
    description: "Filed 3+ near-miss reports in the last 90 days. Catching hazards early saves lives.",
  },
  REFRESHER_CHAMPION: {
    title: "Refresher Champion",
    description: "Completed an annual refresher within 14 days of it being assigned.",
  },
  POLYGLOT: {
    title: "Polyglot",
    description: "Passed a section quiz in a second language.",
  },
};

async function sendAwardNotification(userId: string, code: AwardCode) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({
        type: "award_granted",
        userId,
        data: {
          awardCode: code,
          awardTitle: AWARD_META[code].title,
          awardDescription: AWARD_META[code].description,
        },
      }),
    });
  } catch (err) {
    console.error("Failed to send award notification", { userId, code, err });
  }
}

async function grant(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  orgId: string | null,
  code: AwardCode,
) {
  const meta = AWARD_META[code];
  const { data, error } = await supabase
    .from("awards")
    .insert({
      user_id: userId,
      org_id: orgId,
      code,
      title: meta.title,
      description: meta.description,
      awarded_date: new Date().toISOString().slice(0, 10),
      auto_granted: true,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Insert award failed", { userId, code, error });
    return false;
  }
  console.log("Granted", { userId, code, awardId: data?.id });
  await sendAwardNotification(userId, code);
  return true;
}

async function hasAward(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  code: AwardCode,
  sinceIso?: string,
): Promise<boolean> {
  let q = supabase
    .from("awards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("code", code);
  if (sinceIso) q = q.gte("created_at", sinceIso);
  const { count, error } = await q;
  if (error) {
    console.error("hasAward query failed", error);
    return true; // fail closed: assume granted to avoid duplicate spam
  }
  return (count ?? 0) > 0;
}

async function processUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  orgId: string | null,
  joinedAt: Date,
) {
  const now = new Date();
  const granted: AwardCode[] = [];

  // --- ONBOARDING_COMPLETE (one-shot) ---
  if (!(await hasAward(supabase, userId, "ONBOARDING_COMPLETE"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile?.onboarding_completed_at) {
      if (await grant(supabase, userId, orgId, "ONBOARDING_COMPLETE")) granted.push("ONBOARDING_COMPLETE");
    }
  }

  // --- SAFETY_STREAK_30 (repeatable, every 30 days) ---
  // Granted when: user joined ≥30 days ago AND no incident_reports in their org
  // (excluding near-misses) in the trailing 30 days. Gated by 30-day cooldown.
  if (orgId) {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const joinedLongEnough = joinedAt.getTime() <= thirtyDaysAgo.getTime();
    if (joinedLongEnough && !(await hasAward(supabase, userId, "SAFETY_STREAK_30", thirtyDaysAgo.toISOString()))) {
      const { count: incidentCount, error } = await supabase
        .from("incident_reports")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_near_miss", false)
        .gte("incident_date", thirtyDaysAgo.toISOString().slice(0, 10));
      if (!error && (incidentCount ?? 0) === 0) {
        if (await grant(supabase, userId, orgId, "SAFETY_STREAK_30")) granted.push("SAFETY_STREAK_30");
      }
    }
  }

  // --- HAZARD_SPOTTER (repeatable, every 90 days) ---
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
  if (!(await hasAward(supabase, userId, "HAZARD_SPOTTER", ninetyDaysAgo.toISOString()))) {
    const { count: nearMissCount } = await supabase
      .from("incident_reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_by", userId)
      .eq("is_near_miss", true)
      .gte("created_at", ninetyDaysAgo.toISOString());
    if ((nearMissCount ?? 0) >= 3) {
      if (await grant(supabase, userId, orgId, "HAZARD_SPOTTER")) granted.push("HAZARD_SPOTTER");
    }
  }

  // --- REFRESHER_CHAMPION (one-shot) ---
  // Granted when the user has a passing quiz_attempt within 14 days of the most
  // recent sop_assignments.created_at for the same sop_key, AND they have an
  // earlier passing attempt for that key (proving "re-pass", i.e. a refresher).
  if (!(await hasAward(supabase, userId, "REFRESHER_CHAMPION"))) {
    const { data: passes } = await supabase
      .from("quiz_attempts")
      .select("section_key, created_at, passed")
      .eq("user_id", userId)
      .eq("passed", true)
      .order("created_at", { ascending: true });

    if (passes && passes.length >= 2) {
      // Group passes per section
      const bySection = new Map<string, string[]>();
      for (const p of passes) {
        const arr = bySection.get(p.section_key) ?? [];
        arr.push(p.created_at as string);
        bySection.set(p.section_key, arr);
      }

      let earned = false;
      for (const [sopKey, dates] of bySection) {
        if (dates.length < 2) continue;
        const latestPass = new Date(dates[dates.length - 1]);
        const { data: assn } = await supabase
          .from("sop_assignments")
          .select("created_at")
          .eq("sop_key", sopKey)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!assn?.created_at) continue;
        const assignedAt = new Date(assn.created_at as string);
        const diffDays = (latestPass.getTime() - assignedAt.getTime()) / (24 * 3600 * 1000);
        if (diffDays >= 0 && diffDays <= 14) {
          earned = true;
          break;
        }
      }

      if (earned) {
        if (await grant(supabase, userId, orgId, "REFRESHER_CHAMPION")) granted.push("REFRESHER_CHAMPION");
      }
    }
  }

  // --- POLYGLOT (one-shot) ---
  // Granted when section_progress shows the user completed at least one section
  // in 2+ distinct languages.
  if (!(await hasAward(supabase, userId, "POLYGLOT"))) {
    const { data: progress } = await supabase
      .from("section_progress")
      .select("language_completed_in")
      .eq("user_id", userId)
      .eq("completed", true)
      .not("language_completed_in", "is", null);

    const langs = new Set((progress ?? []).map((r: any) => r.language_completed_in).filter(Boolean));
    if (langs.size >= 2) {
      if (await grant(supabase, userId, orgId, "POLYGLOT")) granted.push("POLYGLOT");
    }
  }

  return granted;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const summary: Record<string, AwardCode[]> = {};
  let processed = 0;
  let errors = 0;

  try {
    const { data: members, error } = await supabase
      .from("org_users")
      .select("user_id, org_id, created_at")
      .eq("is_active", true);
    if (error) throw error;

    for (const m of members ?? []) {
      try {
        const granted = await processUser(
          supabase,
          m.user_id as string,
          (m.org_id as string) ?? null,
          new Date(m.created_at as string),
        );
        if (granted.length) summary[m.user_id as string] = granted;
        processed++;
      } catch (e) {
        errors++;
        console.error("processUser failed", { userId: m.user_id, e });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed, errors, grants: summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("grant-awards top-level error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
