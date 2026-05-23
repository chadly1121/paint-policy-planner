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

  try {
    const { data: rows, error } = await supabase
      .from("doc_reack_required")
      .select("user_id, sop_id, reack_deadline")
      .is("completed_at", null)
      .order("reack_deadline", { ascending: true });

    if (error) throw error;

    // Group by user
    const byUser = new Map<string, Array<{ sop_id: string; reack_deadline: string; title?: string }>>();
    for (const r of rows ?? []) {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push({ sop_id: r.sop_id, reack_deadline: r.reack_deadline });
      byUser.set(r.user_id, arr);
    }

    // Resolve titles
    const sopIds = Array.from(new Set((rows ?? []).map((r) => r.sop_id)));
    const titleMap = new Map<string, string>();
    if (sopIds.length > 0) {
      const { data: sops } = await supabase.from("sops").select("id, title").in("id", sopIds);
      for (const s of sops ?? []) titleMap.set(s.id, s.title);
    }

    let sent = 0;
    const errors: string[] = [];

    for (const [userId, items] of byUser) {
      if (items.length === 0) continue;
      const pendingItems = items.map((i) => ({
        title: titleMap.get(i.sop_id) ?? "Document",
        deadline: i.reack_deadline,
      }));

      try {
        await supabase.functions.invoke("send-notification", {
          body: {
            type: "monthly_reack_digest",
            userId,
            data: { pendingItems },
          },
          headers: { Authorization: `Bearer ${serviceKey}` },
        });
        sent++;
      } catch (e) {
        errors.push(`${userId}: ${(e as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({ users: byUser.size, sent, errors }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e) {
    console.error("reack-monthly-digest error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
