import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type:
    | "section_completed"
    | "redemption_processed"
    | "redemption_requested"
    | "critical_injury_alert"
    | "award_granted"
    | "doc_change_alert"
    | "reack_overdue"
    | "monthly_reack_digest"
    | "cert_missing"
    | "cert_expired"
    | "cert_expiring";
  userId: string;
  data: {
    sectionKey?: string;
    pointsEarned?: number;
    status?: string;
    pointsRequested?: number;
    adminNotes?: string;
    orgId?: string;
    incidentId?: string;
    incidentDate?: string;
    location?: string;
    description?: string;
    injuryDetails?: string;
    awardCode?: string;
    awardTitle?: string;
    awardDescription?: string;
    docTitle?: string;
    changeSummary?: string;
    reackDeadline?: string;
    forEmployeeName?: string;
    forEmployeeUserId?: string;
    isAdminCopy?: boolean;
    pendingItems?: Array<{ title: string; deadline: string }>;
    certType?: string;
    certDisplayName?: string;
    regulatoryReference?: string | null;
    daysUntilExpiry?: number | null;
    renewalIntervalMonths?: number | null;
  };
}

const sectionNames: Record<string, string> = {
  sops: "Standard Operating Procedures",
  safety: "Safety Guidelines",
  policies: "Company Policies",
  training: "Training Materials",
  disciplinary: "Disciplinary Procedures",
};

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Employee Manual <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  const rawBody = await response.text();
  let parsedBody: unknown = rawBody;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // Keep raw text
  }

  if (!response.ok) {
    const message =
      typeof parsedBody === "object" && parsedBody !== null
        ? // Resend tends to return { statusCode, name, message }
          // deno-lint-ignore no-explicit-any
          ((parsedBody as any).message as string | undefined) ?? JSON.stringify(parsedBody)
        : String(parsedBody);

    // Resend "testing mode" limitation: avoid breaking the app flow.
    // We still return a structured result so the caller can surface a friendly warning.
    if (
      response.status === 403 &&
      message.toLowerCase().includes("you can only send testing emails")
    ) {
      console.warn("Resend blocked email (domain not verified). Skipping send.", {
        to,
        subject,
        status: response.status,
      });
      return {
        skipped: true,
        status: response.status,
        error: message,
      };
    }

    throw new Error(`Failed to send email: ${typeof parsedBody === "string" ? parsedBody : JSON.stringify(parsedBody)}`);
  }

  return {
    skipped: false,
    // Return whatever Resend responded with for debugging/visibility.
    body: parsedBody,
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, userId, data }: NotificationRequest = await req.json();

    // Since this function is public (no platform JWT enforcement), validate the JWT manually.
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing Authorization token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Service-role bypass: internal cron functions (e.g. grant-awards) call us
    // with the service role key; trust those callers and skip JWT/user checks.
    const isServiceRoleCaller = jwt === supabaseServiceKey;

    if (!isServiceRoleCaller) {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser(jwt);

      if (authError || !authData?.user) {
        return new Response(JSON.stringify({ error: "Invalid JWT" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Only allow sending to the authenticated user, unless the caller is an admin.
      if (authData.user.id !== userId) {
        const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
          _user_id: authData.user.id,
          _role: "admin",
        });

        if (roleError) {
          console.error("Error checking admin role:", roleError);
        }

        if (!isAdmin) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }
    }

    console.log(`Processing notification: ${type} for user ${userId}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      throw new Error("User profile not found");
    }

    let subject: string;
    let html: string;

    switch (type) {
      case "section_completed":
        subject = `🎉 Section Completed: ${sectionNames[data.sectionKey!] || data.sectionKey}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981;">Congratulations, ${profile.full_name}! 🎉</h1>
            <p>You have successfully completed the <strong>${sectionNames[data.sectionKey!] || data.sectionKey}</strong> section!</p>
            ${data.pointsEarned ? `<p style="font-size: 18px; color: #f59e0b;">You earned <strong>${data.pointsEarned} points</strong>!</p>` : ""}
            <p>Keep up the great work and continue your learning journey.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">This is an automated notification from your Employee Manual platform.</p>
          </div>
        `;
        break;

      case "redemption_requested":
        subject = `📝 Redemption Request Submitted`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #3b82f6;">Redemption Request Received</h1>
            <p>Hi ${profile.full_name},</p>
            <p>Your redemption request for <strong>${data.pointsRequested} points</strong> has been submitted successfully.</p>
            <p>Estimated value: <strong>$${((data.pointsRequested || 0) * 0.01).toFixed(2)}</strong></p>
            <p>An administrator will review your request shortly. You'll receive another email once it's been processed.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">This is an automated notification from your Employee Manual platform.</p>
          </div>
        `;

        // Also notify all admins about the new redemption request
        try {
          const { data: adminRoles, error: adminError } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          if (!adminError && adminRoles && adminRoles.length > 0) {
            const adminUserIds = adminRoles.map((r) => r.user_id);
            const { data: adminProfiles } = await supabase
              .from("profiles")
              .select("email, full_name")
              .in("user_id", adminUserIds);

            if (adminProfiles && adminProfiles.length > 0) {
              const adminSubject = `🔔 New Redemption Request from ${profile.full_name}`;
              const adminHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #f59e0b;">New Redemption Request</h1>
                  <p>A new redemption request requires your review:</p>
                  <ul style="line-height: 1.8;">
                    <li><strong>Employee:</strong> ${profile.full_name}</li>
                    <li><strong>Email:</strong> ${profile.email}</li>
                    <li><strong>Points Requested:</strong> ${data.pointsRequested}</li>
                    <li><strong>Estimated Value:</strong> $${((data.pointsRequested || 0) * 0.01).toFixed(2)}</li>
                  </ul>
                  <p>Please log in to the Admin panel to review and process this request.</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  <p style="color: #6b7280; font-size: 12px;">This is an automated admin notification from the Employee Manual platform.</p>
                </div>
              `;

              for (const admin of adminProfiles) {
                try {
                  console.log(`Sending admin notification to ${admin.email}`);
                  await sendEmail(admin.email, adminSubject, adminHtml);
                  console.log(`Admin notification sent to ${admin.email}`);
                } catch (adminEmailError) {
                  console.error(`Failed to send admin notification to ${admin.email}:`, adminEmailError);
                }
              }
            }
          }
        } catch (adminNotifyError) {
          console.error("Error sending admin notifications:", adminNotifyError);
          // Don't fail the whole request if admin notification fails
        }

        break;

      case "redemption_processed":
        const isApproved = data.status === "approved";
        subject = isApproved ? `✅ Redemption Request Approved!` : `❌ Redemption Request Update`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: ${isApproved ? "#10b981" : "#ef4444"};">
              ${isApproved ? "Your Redemption Request Was Approved! 🎉" : "Redemption Request Update"}
            </h1>
            <p>Hi ${profile.full_name},</p>
            <p>Your redemption request for <strong>${data.pointsRequested} points</strong> has been <strong>${data.status}</strong>.</p>
            ${isApproved ? `<p style="font-size: 18px; color: #10b981;">You will receive a gift card worth <strong>$${((data.pointsRequested || 0) * 0.01).toFixed(2)}</strong>!</p>` : ""}
            ${data.adminNotes ? `<p><strong>Admin Notes:</strong> ${data.adminNotes}</p>` : ""}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">This is an automated notification from your Employee Manual platform.</p>
          </div>
        `;
        break;

      case "critical_injury_alert": {
        // Notify all admins of the reporter's org about a potential critical injury.
        subject = `🚨 CRITICAL INJURY ALERT — Immediate action required`;
        const reportUrl = "https://www.ontario.ca/page/report-workplace-incident";
        const adminHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background:#fef3c7; border:2px solid #f59e0b; padding:16px; border-radius:8px;">
              <h1 style="color:#b45309; margin:0 0 8px 0;">⚠ Possible Critical Injury Reported</h1>
              <p style="margin:0;">A severe incident with injuries has just been filed. Under Ontario OHSA s.51, the employer must notify the Ministry of Labour by telephone within 48 hours and in writing within 14 days. Notify the JHSC (if applicable) and union (if any).</p>
            </div>
            <h2 style="color:#111827; margin-top:24px;">Incident Details</h2>
            <ul style="line-height:1.8;">
              <li><strong>Reported by:</strong> ${profile.full_name} (${profile.email})</li>
              <li><strong>Date:</strong> ${data.incidentDate ?? "—"}</li>
              <li><strong>Location:</strong> ${data.location ?? "—"}</li>
              <li><strong>Description:</strong> ${data.description ?? "—"}</li>
              ${data.injuryDetails ? `<li><strong>Injury Details:</strong> ${data.injuryDetails}</li>` : ""}
            </ul>
            <p style="margin-top:24px;">
              <a href="${reportUrl}" style="background:#dc2626;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Report to Ministry of Labour →</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">SOPed Pro provides operational guidance only. Confirm reporting obligations with your legal/HR advisor.</p>
          </div>
        `;

        try {
          if (!data.orgId) throw new Error("orgId required for critical_injury_alert");
          const { data: admins, error: adminsErr } = await supabase
            .from("org_users")
            .select("user_id")
            .eq("org_id", data.orgId)
            .eq("role", "admin")
            .eq("is_active", true);

          if (adminsErr) throw adminsErr;

          const adminIds = (admins ?? []).map((a) => a.user_id);
          if (adminIds.length > 0) {
            const { data: adminProfiles } = await supabase
              .from("profiles")
              .select("email, full_name")
              .in("user_id", adminIds);

            for (const admin of adminProfiles ?? []) {
              try {
                await sendEmail(admin.email, subject, adminHtml);
                console.log(`Critical injury alert sent to ${admin.email}`);
              } catch (err) {
                console.error(`Failed to send critical injury alert to ${admin.email}:`, err);
              }
            }
          }
        } catch (err) {
          console.error("Error dispatching critical_injury_alert:", err);
        }

        return new Response(JSON.stringify({ success: true, type: "critical_injury_alert" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "award_granted":
        subject = `🏆 New Award: ${data.awardTitle ?? "Achievement Unlocked"}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f59e0b;">Congratulations, ${profile.full_name}! 🏆</h1>
            <p style="font-size: 18px;">You just earned a new award:</p>
            <div style="background:#fffbeb; border:2px solid #f59e0b; padding:16px; border-radius:8px; margin: 16px 0;">
              <h2 style="margin:0 0 8px 0; color:#92400e;">${data.awardTitle ?? "Achievement"}</h2>
              <p style="margin:0; color:#78350f;">${data.awardDescription ?? ""}</p>
            </div>
            <p>Visit your Profile → Awards tab to see all your achievements.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">This is an automated notification from SOPed Pro.</p>
          </div>
        `;
        break;

      case "doc_change_alert": {
        const deadline = data.reackDeadline
          ? new Date(data.reackDeadline).toLocaleDateString()
          : "soon";
        subject = `📄 Document updated — re-acknowledgement required: ${data.docTitle ?? "Document"}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1d4ed8;">Hi ${profile.full_name},</h1>
            <p>The document <strong>${data.docTitle ?? "a policy/SOP"}</strong> has been updated.</p>
            ${data.changeSummary ? `<p><strong>What changed:</strong> ${data.changeSummary}</p>` : `<p>Please review the latest version and complete the new quiz.</p>`}
            <div style="background:#eff6ff; border:1px solid #1d4ed8; padding:12px 16px; border-radius:8px; margin: 16px 0;">
              <p style="margin:0;"><strong>Deadline to re-acknowledge:</strong> ${deadline}</p>
            </div>
            <p>Open SOPed Pro to read the new version and take the updated quiz.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">SOPed Pro · Per POL-010 §4.4, you have until the deadline above to re-acknowledge updated documents.</p>
          </div>
        `;
        break;
      }

      case "reack_overdue": {
        const deadline = data.reackDeadline
          ? new Date(data.reackDeadline).toLocaleDateString()
          : "the deadline";
        if (data.isAdminCopy) {
          subject = `⚠ Re-acknowledgement overdue: ${data.forEmployeeName ?? "An employee"}`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #b91c1c;">Overdue re-acknowledgement</h1>
              <p><strong>${data.forEmployeeName ?? "An employee"}</strong> has not re-acknowledged <strong>${data.docTitle ?? "an updated document"}</strong> by the deadline (${deadline}).</p>
              <p>Visit the Admin → Re-acknowledgement Status panel for the full list.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #6b7280; font-size: 12px;">SOPed Pro automated admin notification.</p>
            </div>
          `;
        } else {
          subject = `⚠ Overdue: re-acknowledge ${data.docTitle ?? "updated document"}`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #b91c1c;">Hi ${profile.full_name},</h1>
              <p>Your deadline (${deadline}) to re-acknowledge <strong>${data.docTitle ?? "an updated document"}</strong> has passed.</p>
              <p>Please open SOPed Pro and complete the re-acknowledgement as soon as possible. Your supervisor has been notified.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #6b7280; font-size: 12px;">SOPed Pro · Per POL-010 §4.4.</p>
            </div>
          `;
        }
        break;
      }

      case "monthly_reack_digest": {
        const items = data.pendingItems ?? [];
        if (items.length === 0) {
          return new Response(JSON.stringify({ success: true, skipped: "no_pending" }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        subject = `📋 Your monthly re-acknowledgement digest (${items.length} pending)`;
        const rows = items
          .map(
            (i) =>
              `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${i.title}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#b91c1c;">${new Date(i.deadline).toLocaleDateString()}</td></tr>`
          )
          .join("");
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1d4ed8;">Hi ${profile.full_name},</h1>
            <p>You have <strong>${items.length}</strong> document${items.length === 1 ? "" : "s"} pending re-acknowledgement.</p>
            <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
              <thead><tr style="background:#f3f4f6;"><th align="left" style="padding:8px;">Document</th><th align="left" style="padding:8px;">Deadline</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <p>Open SOPed Pro to read each updated document and complete the new quiz.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">Monthly digest from SOPed Pro. You're only receiving this because you have open items.</p>
          </div>
        `;
        break;
      }


      case "cert_missing":
      case "cert_expired":
      case "cert_expiring": {
        const name = data.certDisplayName ?? data.certType ?? "a required certification";
        const ref = data.regulatoryReference ? ` (${data.regulatoryReference})` : "";
        if (type === "cert_missing") {
          subject = `⚠ Missing required cert: ${name}`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #b91c1c;">Required certification missing</h1>
              <p>Hi ${profile.full_name},</p>
              <p>You have not uploaded a <strong>${name}</strong> certificate. This is required${ref} for your role.</p>
              <p>Upload it from your Profile page in SOPed Pro.</p>
            </div>`;
        } else if (type === "cert_expired") {
          subject = `🚨 Expired cert: ${name}`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #b91c1c;">Certification expired</h1>
              <p>Hi ${profile.full_name},</p>
              <p>Your <strong>${name}</strong> certificate has expired. This is required${ref}. Upload a current certificate as soon as possible.</p>
            </div>`;
        } else {
          const days = data.daysUntilExpiry ?? "soon";
          const renew = data.renewalIntervalMonths ? ` Renewal interval is ${data.renewalIntervalMonths} months.` : "";
          subject = `⏰ Cert expiring soon: ${name}`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #b45309;">Certification expiring</h1>
              <p>Hi ${profile.full_name},</p>
              <p>Your <strong>${name}</strong> certificate expires in <strong>${days} days</strong>.${renew} Schedule renewal training and upload the new certificate.</p>
            </div>`;
        }
        break;
      }

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    console.log(`Sending email to ${profile.email}`);

    const emailResult = await sendEmail(profile.email, subject, html);

    if (emailResult?.skipped) {
      // IMPORTANT: Return 200 so the client doesn't treat this as a hard failure.
      // This happens when Resend is still in testing mode and the domain isn't verified.
      return new Response(
        JSON.stringify({
          success: true,
          emailSkipped: true,
          reason: "resend_domain_not_verified",
          message:
            "Email sending is currently blocked by Resend testing-mode limits. Verify a sending domain in Resend and use a From address on that domain to send to other recipients.",
          error: emailResult.error,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResponse: emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
