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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
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

    const emailResponse = await sendEmail(profile.email, subject, html);

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
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
