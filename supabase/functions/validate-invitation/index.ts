// Public: validate an invitation token. Returns metadata so the accept page can render.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return json(400, { valid: false, reason: "not_found" });
    }

    const { data: inv } = await admin
      .from("org_invitations")
      .select("email, full_name, role, expires_at, accepted_at, revoked_at, org_id")
      .eq("invitation_token", token)
      .maybeSingle();

    if (!inv) return json(200, { valid: false, reason: "not_found" });
    if (inv.accepted_at) return json(200, { valid: false, reason: "already_accepted" });
    if (inv.revoked_at) return json(200, { valid: false, reason: "revoked" });
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      return json(200, { valid: false, reason: "expired" });
    }

    const { data: org } = await admin
      .from("orgs")
      .select("name, logo_url")
      .eq("id", inv.org_id)
      .maybeSingle();

    return json(200, {
      valid: true,
      email: inv.email,
      full_name: inv.full_name,
      role: inv.role,
      org_name: org?.name ?? "Your team",
      org_logo: org?.logo_url ?? null,
      expires_at: inv.expires_at,
    });
  } catch (e: any) {
    console.error("validate-invitation error:", e);
    return json(500, { valid: false, reason: "not_found", error: e?.message });
  }
});
