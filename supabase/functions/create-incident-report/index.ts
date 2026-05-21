import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_ENCRYPTION_KEY = Deno.env.get('DRIVE_ENCRYPTION_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function decryptToken(encryptedToken: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(DRIVE_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

async function getValidAccessToken(tokenRecord: any, supabase: any): Promise<string> {
  const expiresAt = new Date(tokenRecord.token_expires_at);
  const now = new Date();
  
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Token expiring soon, refreshing...');
    const refreshResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/drive-token-refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_id: tokenRecord.id }),
      }
    );
    
    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const { data: refreshedToken } = await supabase
      .from('user_drive_tokens')
      .select('access_token_encrypted')
      .eq('id', tokenRecord.id)
      .single();
    
    return await decryptToken(refreshedToken.access_token_encrypted);
  }
  
  return await decryptToken(tokenRecord.access_token_encrypted);
}

async function sendAdminNotification(
  supabase: any,
  orgId: string,
  reporterName: string,
  reporterEmail: string,
  incidentDate: string,
  location: string,
  severity: string,
  description: string
) {
  if (!RESEND_API_KEY) {
    console.log('No RESEND_API_KEY configured, skipping email notification');
    return;
  }

  try {
    // Get org admins
    const { data: orgAdmins, error: adminError } = await supabase
      .from('org_users')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('role', 'admin')
      .eq('is_active', true);

    if (adminError || !orgAdmins || orgAdmins.length === 0) {
      console.log('No admins found for org');
      return;
    }

    const adminUserIds = orgAdmins.map((a: any) => a.user_id);
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('email, full_name')
      .in('user_id', adminUserIds);

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log('No admin profiles found');
      return;
    }

    const severityColors: Record<string, string> = {
      minor: '#f59e0b',
      moderate: '#f97316',
      major: '#ef4444',
      critical: '#dc2626',
    };

    const subject = `🚨 New Incident Report - ${severity.toUpperCase()} Severity`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${severityColors[severity] || '#ef4444'};">New Incident Report Filed</h1>
        <p>A new incident report has been submitted and requires your attention:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Reported By</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${reporterName} (${reporterEmail})</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Date of Incident</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${incidentDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Location</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${location}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Severity</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: ${severityColors[severity] || '#ef4444'}; font-weight: bold;">${severity.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-weight: bold;">Description</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${description.substring(0, 500)}${description.length > 500 ? '...' : ''}</td>
          </tr>
        </table>
        <p>Please log in to the application to review the full report and take appropriate action.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">This is an automated notification from SOPed.</p>
      </div>
    `;

    for (const admin of adminProfiles) {
      try {
        console.log(`Sending incident notification to admin: ${admin.email}`);
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "SOPed Notifications <notifications@soped.ai>",
            to: [admin.email],
            subject,
            html,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to send email to ${admin.email}:`, errorText);
        } else {
          console.log(`Email sent to ${admin.email}`);
        }
      } catch (emailError) {
        console.error(`Error sending email to ${admin.email}:`, emailError);
      }
    }
  } catch (error) {
    console.error('Error in sendAdminNotification:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user's org
    const { data: orgUser, error: orgError } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (orgError || !orgUser) {
      return new Response(JSON.stringify({ error: 'User not in organization' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();

    const body = await req.json();
    const {
      incident_date,
      incident_time,
      location,
      description,
      injuries_reported,
      injury_details,
      witnesses,
      immediate_actions,
      root_cause,
      corrective_actions,
      severity,
      is_near_miss,
    } = body;

    // Validate required fields
    if (!incident_date || !location || !description) {
      return new Response(JSON.stringify({ error: 'Missing required fields: incident_date, location, description' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create incident report record
    const { data: report, error: reportError } = await supabase
      .from('incident_reports')
      .insert({
        org_id: orgUser.org_id,
        reported_by: user.id,
        incident_date,
        incident_time: incident_time || null,
        location,
        description,
        injuries_reported: injuries_reported || false,
        injury_details: injury_details || null,
        witnesses: witnesses || null,
        immediate_actions: immediate_actions || null,
        root_cause: root_cause || null,
        corrective_actions: corrective_actions || null,
        severity: severity || 'minor',
        is_near_miss: is_near_miss || false,
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error creating incident report:', reportError);
      throw new Error('Failed to create incident report');
    }

    // Try to save to Google Drive
    let driveFileId = null;
    let driveWebViewLink = null;

    try {
      // Get primary token for org
      const { data: tokenRecord, error: tokenError } = await supabase
        .from('user_drive_tokens')
        .select('*')
        .eq('org_id', orgUser.org_id)
        .eq('is_active', true)
        .eq('is_primary', true)
        .single();

      if (!tokenError && tokenRecord) {
        const accessToken = await getValidAccessToken(tokenRecord, supabase);

        // Get incident-reports folder
        const { data: folderRecord } = await supabase
          .from('org_drive_folders')
          .select('drive_folder_id')
          .eq('org_id', orgUser.org_id)
          .eq('folder_type', 'incident-reports')
          .single();

        if (folderRecord) {
          // Count existing reports for numbering
          const { count } = await supabase
            .from('incident_reports')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', orgUser.org_id);

          const reportNumber = (count || 0);
          const docTitle = `IR-${reportNumber} - ${incident_date} - ${location}`;

          // Create document content
          const docContent = `INCIDENT REPORT
═══════════════════════════════════════════════════════════════

Report Number: IR-${reportNumber}
Date Filed: ${new Date().toLocaleDateString()}
Status: Open

───────────────────────────────────────────────────────────────

INCIDENT DETAILS

Date of Incident: ${incident_date}
Time of Incident: ${incident_time || 'Not specified'}
Location: ${location}
Severity: ${(severity || 'minor').toUpperCase()}

Reported By: ${profile?.full_name || 'Unknown'}
Reporter Email: ${profile?.email || 'Unknown'}

───────────────────────────────────────────────────────────────

DESCRIPTION OF INCIDENT

${description}

───────────────────────────────────────────────────────────────

INJURIES

Injuries Reported: ${injuries_reported ? 'YES' : 'No'}
${injury_details ? `Injury Details: ${injury_details}` : ''}

───────────────────────────────────────────────────────────────

WITNESSES

${witnesses || 'None listed'}

───────────────────────────────────────────────────────────────

IMMEDIATE ACTIONS TAKEN

${immediate_actions || 'None documented'}

───────────────────────────────────────────────────────────────

ROOT CAUSE ANALYSIS

${root_cause || 'To be determined'}

───────────────────────────────────────────────────────────────

CORRECTIVE ACTIONS

${corrective_actions || 'To be determined'}

───────────────────────────────────────────────────────────────

REVIEW SECTION (Admin Use Only)

Reviewed By: _____________________
Review Date: _____________________
Review Notes: 




───────────────────────────────────────────────────────────────
`;

          // Create the Google Doc
          const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: docTitle,
              mimeType: 'application/vnd.google-apps.document',
              parents: [folderRecord.drive_folder_id],
            }),
          });

          if (createResponse.ok) {
            const doc = await createResponse.json();
            driveFileId = doc.id;

            // Add content to the document
            await fetch(
              `https://docs.googleapis.com/v1/documents/${doc.id}:batchUpdate`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  requests: [{ insertText: { location: { index: 1 }, text: docContent } }],
                }),
              }
            );

            // Get the web view link
            const fileResponse = await fetch(
              `https://www.googleapis.com/drive/v3/files/${doc.id}?fields=webViewLink`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            
            if (fileResponse.ok) {
              const fileData = await fileResponse.json();
              driveWebViewLink = fileData.webViewLink;
            }

            // Update the report with drive_file_id
            await supabase
              .from('incident_reports')
              .update({ drive_file_id: driveFileId })
              .eq('id', report.id);

            // Update last_used_at
            await supabase
              .from('user_drive_tokens')
              .update({ last_used_at: new Date().toISOString() })
              .eq('id', tokenRecord.id);

            console.log('Created incident report in Drive:', driveFileId);
          }
        }
      }
    } catch (driveError) {
      console.error('Error saving to Drive:', driveError);
      // Don't fail - report is already in database
    }

    // Send email notification to admins
    await sendAdminNotification(
      supabase,
      orgUser.org_id,
      profile?.full_name || 'Unknown',
      profile?.email || 'Unknown',
      incident_date,
      location,
      severity || 'minor',
      description
    );

    return new Response(JSON.stringify({
      success: true,
      report: {
        ...report,
        drive_file_id: driveFileId,
      },
      drive_web_view_link: driveWebViewLink,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in create-incident-report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
