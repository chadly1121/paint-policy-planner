// Edge function: create an employee without affecting the caller's session.
// The caller must be an authenticated admin of their org.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Confirm caller is an active admin of an org
    const { data: callerOrgUser, error: orgUserErr } = await admin
      .from("org_users")
      .select("org_id, role")
      .eq("user_id", caller.id)
      .eq("is_active", true)
      .maybeSingle();

    if (orgUserErr || !callerOrgUser || callerOrgUser.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, fullName, preferredLanguage = "en", role = "painter" } = body ?? {};
    if (!email || !password || !fullName) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the user via admin API — does NOT affect caller's session
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        preferred_language: preferredLanguage,
        // intentionally NO company_name — prevents handle_new_user from creating a new org
      },
    });

    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Failed to create user";
      const status = /already|exists|registered/i.test(msg) ? 409 : 400;
      return new Response(JSON.stringify({ error: msg }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = created.user.id;

    // Attach to caller's org. handle_new_user only creates user_roles=employee when no company_name.
    const { error: linkErr } = await admin.from("org_users").insert({
      org_id: callerOrgUser.org_id,
      user_id: newUserId,
      role,
      is_active: true,
    });

    if (linkErr) {
      // best-effort rollback
      await admin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: `Failed to add to org: ${linkErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, user_id: newUserId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("admin-create-employee error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
