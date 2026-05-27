import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ComplianceRow {
  cert_type: string;
  cert_display_name: string;
  regulatory_reference: string | null;
  status: "missing" | "expired" | "expiring_soon" | "valid" | "no_expiry";
  days_until_expiry: number | null;
  renewal_interval_months: number | null;
}

const NOTIFIABLE = new Set(["missing", "expired", "expiring_soon"]);

const STATUS_TO_TYPE: Record<string, "cert_missing" | "cert_expired" | "cert_expiring"> = {
  missing: "cert_missing",
  expired: "cert_expired",
  expiring_soon: "cert_expiring",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const summary = {
      orgs: 0,
      users: 0,
      checks: 0,
      notices_sent: 0,
      notices_skipped: 0,
      errors: 0,
    };

    const { data: orgs, error: orgsErr } = await supabase.from("orgs").select("id, name");
    if (orgsErr) throw orgsErr;

    for (const org of orgs || []) {
      summary.orgs++;

      const { data: orgUsers } = await supabase
        .from("org_users")
        .select("user_id, role")
        .eq("org_id", org.id)
        .eq("is_active", true);

      const { data: adminRows } = await supabase
        .from("org_users")
        .select("user_id")
        .eq("org_id", org.id)
        .eq("role", "admin")
        .eq("is_active", true);
      const adminIds = (adminRows ?? []).map((a) => a.user_id);

      for (const ou of orgUsers || []) {
        summary.users++;
        const { data: rowsData, error: rpcErr } = await supabase.rpc(
          "get_user_cert_compliance",
          { _user_id: ou.user_id, _org_id: org.id },
        );
        if (rpcErr) {
          console.error("RPC error", ou.user_id, rpcErr.message);
          summary.errors++;
          continue;
        }
        const rows = (rowsData || []) as ComplianceRow[];
        for (const row of rows) {
          summary.checks++;
          if (!NOTIFIABLE.has(row.status)) continue;

          // Try insert; unique-by-week constraint dedupes
          const { error: insertErr } = await supabase.from("cert_compliance_notices").insert({
            user_id: ou.user_id,
            org_id: org.id,
            cert_type: row.cert_type,
            status_at_notice: row.status,
          });

          if (insertErr) {
            // 23505 = unique violation → already sent this week
            if ((insertErr as any).code === "23505") {
              summary.notices_skipped++;
              continue;
            }
            console.error("notice insert error", insertErr);
            summary.errors++;
            continue;
          }

          // Fire notifications (user + admins)
          const notifType = STATUS_TO_TYPE[row.status];
          const data = {
            certType: row.cert_type,
            certDisplayName: row.cert_display_name,
            regulatoryReference: row.regulatory_reference,
            daysUntilExpiry: row.days_until_expiry,
            renewalIntervalMonths: row.renewal_interval_months,
            orgId: org.id,
          };

          const targets = [ou.user_id, ...adminIds.filter((id) => id !== ou.user_id)];
          for (const targetId of targets) {
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  type: notifType,
                  userId: targetId,
                  data: {
                    ...data,
                    isAdminCopy: targetId !== ou.user_id,
                    forEmployeeUserId: ou.user_id,
                  },
                }),
              });
              summary.notices_sent++;
            } catch (err) {
              console.error("send-notification error", err);
              summary.errors++;
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, summary }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("cert-compliance-check fatal:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
