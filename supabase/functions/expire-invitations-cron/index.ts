// Daily cron: send one-time "your invitation expired" notice to invitees.
// Does NOT delete rows (audit trail preserved).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const nowIso = new Date().toISOString();

  const { data: expired, error } = await admin
    .from("org_invitations")
    .select("id, email, full_name, role, org_id, expires_at")
    .lt("expires_at", nowIso)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .is("expired_notice_sent_at", null)
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let notified = 0;
  for (const inv of expired ?? []) {
    let sent = false;
    if (RESEND_API_KEY) {
      try {
        const { data: org } = await admin
          .from("orgs").select("name").eq("id", inv.org_id).maybeSingle();
        const html = `<p>Your invitation to join <strong>${org?.name ?? "an organization"}</strong> on SOPed has expired.</p>
          <p>If you still want to join, please ask an admin to send you a new invitation.</p>`;
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "SOPed <notifications@soped.ai>",
            to: [inv.email],
            subject: "Your SOPed invitation has expired",
            html,
          }),
        });
        sent = resp.ok;
      } catch (_e) {
        sent = false;
      }
    }
    await admin
      .from("org_invitations")
      .update({ expired_notice_sent_at: new Date().toISOString() })
      .eq("id", inv.id);
    if (sent) notified += 1;
  }

  return new Response(
    JSON.stringify({ ok: true, scanned: expired?.length ?? 0, notified }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
