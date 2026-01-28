import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "section_completed" | "redemption_processed" | "redemption_requested";
  userId: string;
  data: {
    sectionKey?: string;
    pointsEarned?: number;
    status?: string;
    pointsRequested?: number;
    adminNotes?: string;
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
