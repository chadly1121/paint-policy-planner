// Authenticated: an invited user accepts the invitation and joins the org.
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
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) return json(401, { error: "You must be signed in." });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user || !user.email) return json(401, { error: "Invalid auth" });

    const { token } = await req.json();
    if (!token) return json(400, { error: "Missing token" });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: inv } = await admin
      .from("org_invitations")
      .select("*")
      .eq("invitation_token", token)
      .maybeSingle();

    if (!inv) return json(404, { error: "Invitation not found." });
    if (inv.accepted_at) return json(400, { error: "This invitation has already been accepted." });
    if (inv.revoked_at) return json(400, { error: "This invitation has been revoked." });
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      return json(400, { error: "This invitation has expired." });
    }

    if (user.email.toLowerCase() !== inv.email.toLowerCase()) {
      return json(400, {
        error: `This invitation was sent to ${inv.email}. Please sign in with that account.`,
        email_mismatch: true,
        invitation_email: inv.email,
        signed_in_email: user.email,
      });
    }

    // Ensure profile exists
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      await admin.from("profiles").insert({
        user_id: user.id,
        email: user.email,
        full_name: inv.full_name || (user.user_metadata?.full_name as string) || user.email,
      });
      // points_balance for new user
      await admin
        .from("points_balance")
        .insert({ user_id: user.id, total_points: 0, redeemed_points: 0 });
    }

    // Insert org_users membership (idempotent)
    const { data: existingMembership } = await admin
      .from("org_users")
      .select("id, is_active, role")
      .eq("org_id", inv.org_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMembership) {
      await admin
        .from("org_users")
        .update({ is_active: true, role: inv.role })
        .eq("id", existingMembership.id);
    } else {
      const { error: linkErr } = await admin.from("org_users").insert({
        org_id: inv.org_id,
        user_id: user.id,
        role: inv.role,
        is_active: true,
      });
      if (linkErr) return json(500, { error: `Failed to join org: ${linkErr.message}` });
    }

    // Mark invitation accepted
    await admin
      .from("org_invitations")
      .update({ accepted_at: new Date().toISOString(), accepted_by_user: user.id })
      .eq("id", inv.id);

    // Ensure base user_roles row (employee). Admin role only if invited as admin.
    await admin
      .from("user_roles")
      .upsert(
        { user_id: user.id, role: inv.role === "admin" ? "admin" : "employee" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );

    return json(200, { success: true, redirect_to: "/" });
  } catch (e: any) {
    console.error("accept-invitation error:", e);
    return json(500, { error: e?.message ?? "Internal error" });
  }
});
