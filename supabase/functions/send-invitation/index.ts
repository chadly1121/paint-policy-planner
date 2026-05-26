// Admin-only: create an org invitation and email it to the invitee.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FRONTEND_URL = Deno.env.get("FRONTEND_URL") ?? "https://soped.ai";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function buildEmail(opts: {
  orgName: string;
  orgLogo: string | null;
  invitedByName: string;
  role: string;
  acceptUrl: string;
  expiresAt: string;
}) {
  const expiresFormatted = new Date(opts.expiresAt).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
  const logoHtml = opts.orgLogo
    ? `<img src="${opts.orgLogo}" alt="${opts.orgName}" style="max-height:48px;margin-bottom:12px"/>`
    : "";
  return `
<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f6f8;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
    ${logoHtml}
    <h1 style="font-size:22px;color:#0f172a;margin:0 0 8px">You're invited to join ${opts.orgName}</h1>
    <p style="color:#475569;font-size:15px;line-height:1.6">
      <strong>${opts.invitedByName}</strong> has invited you to join <strong>${opts.orgName}</strong>
      on SOPed as a <strong>${opts.role}</strong>.
    </p>
    <div style="text-align:center;margin:32px 0">
      <a href="${opts.acceptUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:8px;font-size:16px">
        Accept Invitation
      </a>
    </div>
    <p style="color:#64748b;font-size:13px;line-height:1.5">
      This invitation expires in 7 days on <strong>${expiresFormatted}</strong>.
    </p>
    <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "").trim();
    if (!jwt) return json(401, { error: "Missing auth" });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return json(401, { error: "Invalid auth" });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const emailRaw = String(body?.email ?? "").trim().toLowerCase();
    const role = String(body?.role ?? "painter");
    const fullName = body?.full_name ? String(body.full_name).trim() : null;
    const invitationId = body?.invitation_id ? String(body.invitation_id) : null;

    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return json(400, { error: "Valid email required" });
    }
    if (!["admin", "foreman", "painter", "office", "other"].includes(role)) {
      return json(400, { error: "Invalid role" });
    }

    // Verify caller is admin of an org
    const { data: callerOrgUser } = await admin
      .from("org_users")
      .select("org_id, role")
      .eq("user_id", caller.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!callerOrgUser || (callerOrgUser.role !== "admin" && callerOrgUser.role !== "office")) {
      return json(403, { error: "Forbidden — admin or office only" });
    }
    // Only admins can invite other admins
    if (role === "admin" && callerOrgUser.role !== "admin") {
      return json(403, { error: "Only admins can invite other admins" });
    }
    const orgId = callerOrgUser.org_id;

    // Already a member?
    const { data: existingMembers } = await admin
      .from("org_users")
      .select("user_id, profiles:user_id(email)")
      .eq("org_id", orgId);
    // Simpler check: fetch profiles for this org and compare email
    const { data: orgProfiles } = await admin
      .from("org_users")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("is_active", true);
    if (orgProfiles?.length) {
      const ids = orgProfiles.map((u) => u.user_id);
      const { data: matching } = await admin
        .from("profiles")
        .select("email")
        .in("user_id", ids);
      if (matching?.some((p) => p.email?.toLowerCase() === emailRaw)) {
        return json(409, { error: "This person is already a member of your organization." });
      }
    }

    // Get org info for email
    const { data: orgRow } = await admin
      .from("orgs")
      .select("name, logo_url")
      .eq("id", orgId)
      .maybeSingle();

    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", caller.id)
      .maybeSingle();

    let invitationRow: any = null;

    if (invitationId) {
      // Resend flow: extend expiry & resend
      const { data: existing } = await admin
        .from("org_invitations")
        .select("*")
        .eq("id", invitationId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (!existing) return json(404, { error: "Invitation not found" });
      if (existing.accepted_at) return json(400, { error: "Invitation already accepted" });

      const { data: updated, error: updErr } = await admin
        .from("org_invitations")
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          revoked_at: null,
          revoked_by: null,
        })
        .eq("id", invitationId)
        .select()
        .single();
      if (updErr) return json(500, { error: updErr.message });
      invitationRow = updated;
    } else {
      // New invitation
      const { data: inserted, error: insErr } = await admin
        .from("org_invitations")
        .insert({
          org_id: orgId,
          invited_by: caller.id,
          email: emailRaw,
          full_name: fullName,
          role,
        })
        .select()
        .single();

      if (insErr) {
        if (insErr.code === "23505") {
          return json(409, { error: "A pending invitation already exists for this email." });
        }
        return json(500, { error: insErr.message });
      }
      invitationRow = inserted;
    }

    const acceptUrl = `${FRONTEND_URL}/accept-invite?token=${invitationRow.invitation_token}`;

    // Send email if possible
    let emailSent = false;
    let warning: string | undefined;

    if (RESEND_API_KEY) {
      try {
        const html = buildEmail({
          orgName: orgRow?.name ?? "your team",
          orgLogo: orgRow?.logo_url ?? null,
          invitedByName: inviterProfile?.full_name || inviterProfile?.email || "An admin",
          role,
          acceptUrl,
          expiresAt: invitationRow.expires_at,
        });
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "SOPed <notifications@soped.ai>",
            to: [emailRaw],
            subject: `You're invited to join ${orgRow?.name ?? "SOPed"} on SOPed`,
            html,
          }),
        });
        if (resp.ok) {
          emailSent = true;
        } else {
          warning = `Email send failed (${resp.status}). Share this invitation link manually: ${acceptUrl}`;
        }
      } catch (e: any) {
        warning = `Email send failed (${e?.message}). Share this invitation link manually: ${acceptUrl}`;
      }
    } else {
      warning = `Email not sent — Resend not configured. Share this invitation link manually: ${acceptUrl}`;
    }

    // Strip token before returning (admin doesn't need it)
    const { invitation_token: _t, ...safe } = invitationRow;
    return json(200, { ok: true, invitation: safe, emailSent, warning, acceptUrl: warning ? acceptUrl : undefined });
  } catch (e: any) {
    console.error("send-invitation error:", e);
    return json(500, { error: e?.message ?? "Internal error" });
  }
});
