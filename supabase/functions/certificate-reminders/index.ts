import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExpiringCertificate {
  id: string;
  name: string;
  expiry_date: string;
  user_id: string;
  user_email: string;
  user_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get certificates expiring within the next month
    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    console.log(`Checking for certificates expiring between ${now.toISOString()} and ${oneMonthFromNow.toISOString()}`);

    // Get all certificates with expiry dates in the next month
    const { data: certificates, error: certError } = await supabase
      .from("certificates")
      .select(`
        id,
        name,
        expiry_date,
        user_id,
        reminder_sent_at
      `)
      .gte("expiry_date", now.toISOString().split("T")[0])
      .lte("expiry_date", oneMonthFromNow.toISOString().split("T")[0]);

    if (certError) {
      console.error("Error fetching certificates:", certError);
      throw certError;
    }

    if (!certificates || certificates.length === 0) {
      console.log("No expiring certificates found");
      return new Response(
        JSON.stringify({ message: "No expiring certificates found", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${certificates.length} expiring certificates`);

    // Filter to only certificates that haven't been notified in the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const certificatesToNotify = certificates.filter((cert) => {
      if (!cert.reminder_sent_at) return true;
      const lastSent = new Date(cert.reminder_sent_at);
      return lastSent < oneWeekAgo;
    });

    console.log(`${certificatesToNotify.length} certificates need notification`);

    if (certificatesToNotify.length === 0) {
      return new Response(
        JSON.stringify({ message: "All certificates already notified this week", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user emails for these certificates
    const userIds = [...new Set(certificatesToNotify.map((c) => c.user_id))];
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .in("user_id", userIds);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      throw profileError;
    }

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    // Group certificates by user
    const userCertificates = new Map<string, ExpiringCertificate[]>();
    for (const cert of certificatesToNotify) {
      const profile = profileMap.get(cert.user_id);
      if (!profile) continue;

      const expiringCert: ExpiringCertificate = {
        id: cert.id,
        name: cert.name,
        expiry_date: cert.expiry_date,
        user_id: cert.user_id,
        user_email: profile.email,
        user_name: profile.full_name,
      };

      if (!userCertificates.has(cert.user_id)) {
        userCertificates.set(cert.user_id, []);
      }
      userCertificates.get(cert.user_id)!.push(expiringCert);
    }

    let sentCount = 0;
    const sentCertIds: string[] = [];

    // Send emails to each user
    for (const [userId, certs] of userCertificates) {
      const userEmail = certs[0].user_email;
      const userName = certs[0].user_name;

      const certListHtml = certs
        .map((c) => {
          const expiryDate = new Date(c.expiry_date);
          const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return `<li><strong>${c.name}</strong> - Expires ${expiryDate.toLocaleDateString()} (${daysLeft} days left)</li>`;
        })
        .join("");

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Certificate Renewal Reminder</h1>
          <p>Hi ${userName},</p>
          <p>This is a reminder that the following certificates are expiring soon and need renewal:</p>
          <ul style="background: #f9f9f9; padding: 20px 40px; border-radius: 8px;">
            ${certListHtml}
          </ul>
          <p>Please ensure you renew these certificates before they expire to maintain compliance.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This is an automated reminder from your Employee Manual system.
          </p>
        </div>
      `;

      try {
        const { error: emailError } = await resend.emails.send({
          from: "Reminders <onboarding@resend.dev>",
          to: [userEmail],
          subject: `Action Required: ${certs.length} Certificate(s) Expiring Soon`,
          html,
        });

        if (emailError) {
          console.error(`Failed to send email to ${userEmail}:`, emailError);
        } else {
          console.log(`Sent reminder email to ${userEmail} for ${certs.length} certificates`);
          sentCount++;
          sentCertIds.push(...certs.map((c) => c.id));
        }
      } catch (err) {
        console.error(`Error sending email to ${userEmail}:`, err);
      }
    }

    // Update reminder_sent_at for sent certificates
    if (sentCertIds.length > 0) {
      const { error: updateError } = await supabase
        .from("certificates")
        .update({ reminder_sent_at: new Date().toISOString() })
        .in("id", sentCertIds);

      if (updateError) {
        console.error("Error updating reminder_sent_at:", updateError);
      }
    }

    console.log(`Sent ${sentCount} reminder emails`);

    return new Response(
      JSON.stringify({
        message: `Sent ${sentCount} reminder emails`,
        sent: sentCount,
        certificates: sentCertIds.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in certificate-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
