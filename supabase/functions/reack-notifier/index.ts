import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let alerts_sent = 0;
  let overdue_sent = 0;
  const errors: string[] = [];

  try {
    const { data: rows, error } = await supabase
      .from("doc_reack_required")
      .select("id, user_id, org_id, sop_id, reack_deadline, first_notified_at, sent_overdue_at")
      .is("completed_at", null);

    if (error) throw error;

    const now = new Date();

    for (const row of rows ?? []) {
      // Load doc title
      const { data: sop } = await supabase
        .from("sops")
        .select("title")
        .eq("id", row.sop_id)
        .maybeSingle();

      const docTitle = sop?.title ?? "an updated document";
      const deadline = new Date(row.reack_deadline);

      // First-time alert
      if (!row.first_notified_at) {
        try {
          await supabase.functions.invoke("send-notification", {
            body: {
              type: "doc_change_alert",
              userId: row.user_id,
              data: {
                docTitle,
                reackDeadline: row.reack_deadline,
              },
            },
            headers: { Authorization: `Bearer ${serviceKey}` },
          });
          await supabase
            .from("doc_reack_required")
            .update({ first_notified_at: now.toISOString() })
            .eq("id", row.id);
          alerts_sent++;
        } catch (e) {
          errors.push(`alert ${row.id}: ${(e as Error).message}`);
        }
        continue;
      }

      // Overdue: send once to user + admins
      if (deadline < now && !row.sent_overdue_at) {
        try {
          // User
          await supabase.functions.invoke("send-notification", {
            body: {
              type: "reack_overdue",
              userId: row.user_id,
              data: { docTitle, reackDeadline: row.reack_deadline },
            },
            headers: { Authorization: `Bearer ${serviceKey}` },
          });

          // Org admins
          const { data: admins } = await supabase
            .from("org_users")
            .select("user_id")
            .eq("org_id", row.org_id)
            .eq("role", "admin")
            .eq("is_active", true);

          const { data: userProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", row.user_id)
            .maybeSingle();

          for (const a of admins ?? []) {
            await supabase.functions.invoke("send-notification", {
              body: {
                type: "reack_overdue",
                userId: a.user_id,
                data: {
                  docTitle,
                  reackDeadline: row.reack_deadline,
                  forEmployeeName: userProfile?.full_name ?? "An employee",
                  isAdminCopy: true,
                },
              },
              headers: { Authorization: `Bearer ${serviceKey}` },
            });
          }

          await supabase
            .from("doc_reack_required")
            .update({ sent_overdue_at: now.toISOString() })
            .eq("id", row.id);
          overdue_sent++;
        } catch (e) {
          errors.push(`overdue ${row.id}: ${(e as Error).message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ processed: rows?.length ?? 0, alerts_sent, overdue_sent, errors }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e) {
    console.error("reack-notifier error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
