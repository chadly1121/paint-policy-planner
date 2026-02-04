import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default reminder settings (used when org has no custom settings)
const DEFAULT_FIRST_REMINDER_DAYS = 30;
const DEFAULT_URGENT_REMINDER_DAYS = 14;
const DEFAULT_REMINDER_FREQUENCY_DAYS = 7;

interface OrgSettings {
  org_id: string;
  cert_reminder_days_first: number;
  cert_reminder_days_urgent: number;
  cert_reminder_frequency_days: number;
}

interface CertificateWithOrg {
  id: string;
  name: string;
  expiry_date: string;
  user_id: string;
  org_id: string | null;
  reminder_sent_at: string | null;
}

interface ExpiringCertificate {
  id: string;
  name: string;
  expiry_date: string;
  user_id: string;
  user_email: string;
  user_name: string;
  org_id: string | null;
  days_left: number;
  is_urgent: boolean;
}

interface OrgAdmin {
  user_id: string;
  email: string;
  full_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`Starting certificate reminder check at ${now.toISOString()}`);

    // Fetch all org settings for configurable thresholds
    const { data: orgSettings, error: settingsError } = await supabase
      .from("org_settings")
      .select("org_id, cert_reminder_days_first, cert_reminder_days_urgent, cert_reminder_frequency_days");

    if (settingsError) {
      console.error("Error fetching org settings:", settingsError);
    }

    // Create a map of org_id -> settings
    const settingsMap = new Map<string, OrgSettings>();
    if (orgSettings) {
      for (const setting of orgSettings) {
        settingsMap.set(setting.org_id, setting);
      }
    }

    // Helper to get settings for an org (falls back to defaults)
    const getOrgSettings = (orgId: string | null): { firstDays: number; urgentDays: number; frequencyDays: number } => {
      if (orgId && settingsMap.has(orgId)) {
        const s = settingsMap.get(orgId)!;
        return {
          firstDays: s.cert_reminder_days_first,
          urgentDays: s.cert_reminder_days_urgent,
          frequencyDays: s.cert_reminder_frequency_days,
        };
      }
      return {
        firstDays: DEFAULT_FIRST_REMINDER_DAYS,
        urgentDays: DEFAULT_URGENT_REMINDER_DAYS,
        frequencyDays: DEFAULT_REMINDER_FREQUENCY_DAYS,
      };
    };

    // Get the maximum possible reminder window
    const maxFirstDays = Math.max(
      DEFAULT_FIRST_REMINDER_DAYS,
      ...(orgSettings?.map(s => s.cert_reminder_days_first) || [])
    );
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxFirstDays);

    console.log(`Checking for certificates expiring between ${now.toISOString()} and ${maxDate.toISOString()}`);

    // Get all certificates with expiry dates in the max window
    const { data: certificates, error: certError } = await supabase
      .from("certificates")
      .select(`
        id,
        name,
        expiry_date,
        user_id,
        org_id,
        reminder_sent_at
      `)
      .gte("expiry_date", now.toISOString().split("T")[0])
      .lte("expiry_date", maxDate.toISOString().split("T")[0]);

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

    console.log(`Found ${certificates.length} certificates in the expiry window`);

    // Filter certificates based on per-org settings
    const certificatesToNotify: CertificateWithOrg[] = [];
    
    for (const cert of certificates as CertificateWithOrg[]) {
      const settings = getOrgSettings(cert.org_id);
      const expiryDate = new Date(cert.expiry_date);
      const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Check if certificate is within this org's reminder window
      if (daysLeft > settings.firstDays) {
        continue;
      }

      // Check if we've already sent a reminder within the frequency period
      if (cert.reminder_sent_at) {
        const lastSent = new Date(cert.reminder_sent_at);
        const daysSinceLastReminder = Math.ceil((now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastReminder < settings.frequencyDays) {
          continue;
        }
      }

      certificatesToNotify.push(cert);
    }

    console.log(`${certificatesToNotify.length} certificates need notification`);

    if (certificatesToNotify.length === 0) {
      return new Response(
        JSON.stringify({ message: "All certificates already notified within their frequency window", sent: 0 }),
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

    // Get org admins for notifications
    const orgIds = [...new Set(certificatesToNotify.filter(c => c.org_id).map(c => c.org_id!))];
    const orgAdminsMap = new Map<string, OrgAdmin[]>();

    if (orgIds.length > 0) {
      const { data: orgAdmins, error: adminError } = await supabase
        .from("org_users")
        .select("org_id, user_id")
        .in("org_id", orgIds)
        .eq("role", "admin")
        .eq("is_active", true);

      if (adminError) {
        console.error("Error fetching org admins:", adminError);
      } else if (orgAdmins && orgAdmins.length > 0) {
        const adminUserIds = [...new Set(orgAdmins.map(a => a.user_id))];
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .in("user_id", adminUserIds);

        const adminProfileMap = new Map(adminProfiles?.map(p => [p.user_id, p]) || []);

        for (const admin of orgAdmins) {
          const profile = adminProfileMap.get(admin.user_id);
          if (profile) {
            if (!orgAdminsMap.has(admin.org_id)) {
              orgAdminsMap.set(admin.org_id, []);
            }
            orgAdminsMap.get(admin.org_id)!.push({
              user_id: admin.user_id,
              email: profile.email,
              full_name: profile.full_name,
            });
          }
        }
      }
    }

    // Group certificates by user with enriched data
    const userCertificates = new Map<string, ExpiringCertificate[]>();
    
    // Also group by org for admin notifications
    const orgCertificates = new Map<string, ExpiringCertificate[]>();
    
    for (const cert of certificatesToNotify) {
      const profile = profileMap.get(cert.user_id);
      if (!profile) continue;

      const settings = getOrgSettings(cert.org_id);
      const expiryDate = new Date(cert.expiry_date);
      const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isUrgent = daysLeft <= settings.urgentDays;

      const expiringCert: ExpiringCertificate = {
        id: cert.id,
        name: cert.name,
        expiry_date: cert.expiry_date,
        user_id: cert.user_id,
        user_email: profile.email,
        user_name: profile.full_name,
        org_id: cert.org_id,
        days_left: daysLeft,
        is_urgent: isUrgent,
      };

      if (!userCertificates.has(cert.user_id)) {
        userCertificates.set(cert.user_id, []);
      }
      userCertificates.get(cert.user_id)!.push(expiringCert);

      // Group by org for admin notifications
      if (cert.org_id) {
        if (!orgCertificates.has(cert.org_id)) {
          orgCertificates.set(cert.org_id, []);
        }
        orgCertificates.get(cert.org_id)!.push(expiringCert);
      }
    }

    let sentCount = 0;
    const sentCertIds: string[] = [];

    // Send emails to each user
    for (const [userId, certs] of userCertificates) {
      const userEmail = certs[0].user_email;
      const userName = certs[0].user_name;
      const hasUrgent = certs.some(c => c.is_urgent);

      const certListHtml = certs
        .sort((a, b) => a.days_left - b.days_left)
        .map((c) => {
          const expiryDate = new Date(c.expiry_date);
          const urgentStyle = c.is_urgent ? 'color: #dc2626; font-weight: bold;' : '';
          const urgentLabel = c.is_urgent ? ' ⚠️ URGENT' : '';
          return `<li style="${urgentStyle}"><strong>${c.name}</strong> - Expires ${expiryDate.toLocaleDateString()} (${c.days_left} days left)${urgentLabel}</li>`;
        })
        .join("");

      const subjectPrefix = hasUrgent ? "⚠️ URGENT: " : "";
      const subject = `${subjectPrefix}Action Required: ${certs.length} Certificate(s) Expiring Soon`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: ${hasUrgent ? '#dc2626' : '#333'};">Certificate Renewal Reminder</h1>
          <p>Hi ${userName},</p>
          <p>This is a reminder that the following certificates are expiring soon and need renewal:</p>
          <ul style="background: #f9f9f9; padding: 20px 40px; border-radius: 8px;">
            ${certListHtml}
          </ul>
          ${hasUrgent ? '<p style="color: #dc2626; font-weight: bold;">⚠️ Some certificates require immediate attention!</p>' : ''}
          <p>Please ensure you renew these certificates before they expire to maintain compliance.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This is an automated reminder from your Employee Manual system.
          </p>
        </div>
      `;

      try {
        const { error: emailError } = await resend.emails.send({
          from: "Reminders <notifications@soped.ai>",
          to: [userEmail],
          subject,
          html,
        });

        if (emailError) {
          const errorMessage = typeof emailError === 'object' && 'message' in emailError 
            ? (emailError as { message: string }).message 
            : String(emailError);
          
          if (errorMessage.includes('not a verified')) {
            console.log(`Skipping unverified domain for ${userEmail}`);
          } else {
            console.error(`Failed to send email to ${userEmail}:`, emailError);
          }
        } else {
          console.log(`Sent reminder email to ${userEmail} for ${certs.length} certificates (urgent: ${hasUrgent})`);
          sentCount++;
          sentCertIds.push(...certs.map((c) => c.id));
        }
      } catch (err) {
        console.error(`Error sending email to ${userEmail}:`, err);
      }
    }

    // Send summary emails to org admins
    for (const [orgId, certs] of orgCertificates) {
      const admins = orgAdminsMap.get(orgId);
      if (!admins || admins.length === 0) continue;

      const hasUrgent = certs.some(c => c.is_urgent);
      
      // Group by employee
      const byEmployee = new Map<string, ExpiringCertificate[]>();
      for (const cert of certs) {
        if (!byEmployee.has(cert.user_id)) {
          byEmployee.set(cert.user_id, []);
        }
        byEmployee.get(cert.user_id)!.push(cert);
      }

      const employeeListHtml = [...byEmployee.entries()]
        .map(([_, empCerts]) => {
          const empName = empCerts[0].user_name;
          const certItems = empCerts
            .sort((a, b) => a.days_left - b.days_left)
            .map(c => {
              const expiryDate = new Date(c.expiry_date);
              const urgentStyle = c.is_urgent ? 'color: #dc2626; font-weight: bold;' : '';
              const urgentLabel = c.is_urgent ? ' ⚠️' : '';
              return `<li style="${urgentStyle}">${c.name} - ${expiryDate.toLocaleDateString()} (${c.days_left} days)${urgentLabel}</li>`;
            })
            .join('');
          return `<div style="margin-bottom: 16px;"><strong>${empName}</strong><ul>${certItems}</ul></div>`;
        })
        .join('');

      const subjectPrefix = hasUrgent ? "⚠️ URGENT: " : "";
      const subject = `${subjectPrefix}Admin Alert: ${certs.length} Employee Certificate(s) Expiring Soon`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: ${hasUrgent ? '#dc2626' : '#333'};">Employee Certificate Expiry Report</h1>
          <p>The following employee certificates are expiring within the next 30 days:</p>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
            ${employeeListHtml}
          </div>
          ${hasUrgent ? '<p style="color: #dc2626; font-weight: bold;">⚠️ Some certificates expire within 14 days and require immediate attention!</p>' : ''}
          <p>Please follow up with employees to ensure timely renewals.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This is an automated admin notification from your Employee Manual system.
          </p>
        </div>
      `;

      for (const admin of admins) {
        try {
          const { error: emailError } = await resend.emails.send({
            from: "Reminders <notifications@soped.ai>",
            to: [admin.email],
            subject,
            html,
          });

          if (emailError) {
            const errorMessage = typeof emailError === 'object' && 'message' in emailError 
              ? (emailError as { message: string }).message 
              : String(emailError);
            
            if (errorMessage.includes('not a verified')) {
              console.log(`Skipping unverified admin domain for ${admin.email}`);
            } else {
              console.error(`Failed to send admin email to ${admin.email}:`, emailError);
            }
          } else {
            console.log(`Sent admin summary to ${admin.email} for ${certs.length} certificates`);
            sentCount++;
          }
        } catch (err) {
          console.error(`Error sending admin email to ${admin.email}:`, err);
        }
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

    console.log(`Sent ${sentCount} reminder emails for ${sentCertIds.length} certificates`);

    return new Response(
      JSON.stringify({
        message: `Sent ${sentCount} reminder emails`,
        sent: sentCount,
        certificates: sentCertIds.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in certificate-reminders function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
