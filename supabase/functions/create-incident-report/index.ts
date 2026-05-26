import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildIncidentDocBody,
  decryptDriveToken,
  type IncidentRecord,
} from "../_shared/incident-doc-body.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_ENCRYPTION_KEY = Deno.env.get('DRIVE_ENCRYPTION_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function getValidAccessToken(tokenRecord: any, supabase: any): Promise<string> {
  const expiresAt = new Date(tokenRecord.token_expires_at);
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/drive-token-refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_id: tokenRecord.id }),
    });
    const { data: refreshed } = await supabase
      .from('user_drive_tokens')
      .select('access_token_encrypted')
      .eq('id', tokenRecord.id)
      .single();
    return await decryptDriveToken(refreshed.access_token_encrypted, DRIVE_ENCRYPTION_KEY);
  }
  return await decryptDriveToken(tokenRecord.access_token_encrypted, DRIVE_ENCRYPTION_KEY);
}

type EmailResult = {
  sent: boolean;
  reason: 'sent' | 'no_resend_key' | 'no_admin_emails' | 'send_failed';
};

async function sendAdminNotification(
  supabase: any,
  orgId: string,
  reporterName: string,
  reporterEmail: string,
  incidentDate: string,
  location: string,
  severity: string,
  description: string,
): Promise<EmailResult> {
  if (!RESEND_API_KEY) return { sent: false, reason: 'no_resend_key' };

  try {
    const { data: orgAdmins } = await supabase
      .from('org_users')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('role', 'admin')
      .eq('is_active', true);
    if (!orgAdmins?.length) return { sent: false, reason: 'no_admin_emails' };

    const ids = orgAdmins.map((a: any) => a.user_id);
    const { data: adminProfiles } = await supabase
      .from('profiles').select('email, full_name').in('user_id', ids);
    if (!adminProfiles?.length) return { sent: false, reason: 'no_admin_emails' };

    const severityColors: Record<string, string> = {
      minor: '#f59e0b', moderate: '#f97316', severe: '#ef4444', critical: '#dc2626',
    };
    const subject = `🚨 New Incident Report - ${severity.toUpperCase()} Severity`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${severityColors[severity] || '#ef4444'};">New Incident Report Filed</h1>
        <p>A new incident report has been submitted and requires your attention:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">Reported By</td><td style="padding:10px;border:1px solid #e5e7eb;">${reporterName} (${reporterEmail})</td></tr>
          <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">Date</td><td style="padding:10px;border:1px solid #e5e7eb;">${incidentDate}</td></tr>
          <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">Location</td><td style="padding:10px;border:1px solid #e5e7eb;">${location}</td></tr>
          <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">Severity</td><td style="padding:10px;border:1px solid #e5e7eb;color:${severityColors[severity] || '#ef4444'};font-weight:bold;">${severity.toUpperCase()}</td></tr>
          <tr><td style="padding:10px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;">Description</td><td style="padding:10px;border:1px solid #e5e7eb;">${description.substring(0, 500)}${description.length > 500 ? '...' : ''}</td></tr>
        </table>
        <p>Please log in to review the full report.</p>
      </div>`;

    let anySuccess = false;
    let anyFailure = false;
    for (const admin of adminProfiles) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'SOPed Notifications <notifications@soped.ai>',
            to: [admin.email], subject, html,
          }),
        });
        if (res.ok) anySuccess = true;
        else { anyFailure = true; console.error('Resend error:', await res.text()); }
      } catch (e) { anyFailure = true; console.error('Resend exception:', e); }
    }
    if (anySuccess) return { sent: true, reason: 'sent' };
    if (anyFailure) return { sent: false, reason: 'send_failed' };
    return { sent: false, reason: 'no_admin_emails' };
  } catch (e) {
    console.error('sendAdminNotification error:', e);
    return { sent: false, reason: 'send_failed' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await userSupabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: orgUser, error: orgErr } = await supabase
      .from('org_users').select('org_id')
      .eq('user_id', user.id).eq('is_active', true).single();
    if (orgErr || !orgUser) {
      return new Response(JSON.stringify({ error: 'User not in organization' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: profile } = await supabase
      .from('profiles').select('full_name, email').eq('user_id', user.id).single();

    const body = await req.json();
    const {
      incident_date, incident_time, location, description,
      injuries_reported, injury_details, witnesses, immediate_actions,
      root_cause, corrective_actions, severity, is_near_miss,
    } = body;

    if (!incident_date || !location || !description) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: report, error: reportError } = await supabase
      .from('incident_reports')
      .insert({
        org_id: orgUser.org_id,
        reported_by: user.id,
        incident_date,
        incident_time: incident_time || null,
        location, description,
        injuries_reported: injuries_reported || false,
        injury_details: injury_details || null,
        witnesses: witnesses || null,
        immediate_actions: immediate_actions || null,
        root_cause: root_cause || null,
        corrective_actions: corrective_actions || null,
        severity: severity || 'minor',
        is_near_miss: is_near_miss || false,
      })
      .select().single();
    if (reportError) {
      console.error('Insert incident error:', reportError);
      throw new Error(reportError.message || 'Failed to create incident report');
    }

    // Drive doc
    let driveFileId: string | null = null;
    let driveWebViewLink: string | null = null;
    try {
      const { data: tokenRecord } = await supabase
        .from('user_drive_tokens').select('*')
        .eq('org_id', orgUser.org_id).eq('is_active', true).eq('is_primary', true)
        .maybeSingle();
      if (tokenRecord) {
        const accessToken = await getValidAccessToken(tokenRecord, supabase);
        const { data: folderRecord } = await supabase
          .from('org_drive_folders').select('drive_folder_id')
          .eq('org_id', orgUser.org_id).eq('folder_type', 'incident-reports')
          .maybeSingle();
        if (folderRecord) {
          const { count } = await supabase
            .from('incident_reports').select('id', { count: 'exact', head: true })
            .eq('org_id', orgUser.org_id);
          const reportNumber = (count || 1) - 1;
          const docTitle = `IR-${reportNumber} - ${incident_date} - ${location}`;

          const docContent = buildIncidentDocBody(
            report as IncidentRecord,
            [],
            {
              reportNumber,
              reporterName: profile?.full_name || 'Unknown',
              reporterEmail: profile?.email || 'Unknown',
            },
          );

          const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: docTitle,
              mimeType: 'application/vnd.google-apps.document',
              parents: [folderRecord.drive_folder_id],
            }),
          });
          if (createRes.ok) {
            const doc = await createRes.json();
            driveFileId = doc.id;
            await fetch(`https://docs.googleapis.com/v1/documents/${doc.id}:batchUpdate`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requests: [{ insertText: { location: { index: 1 }, text: docContent } }],
              }),
            });
            const fr = await fetch(
              `https://www.googleapis.com/drive/v3/files/${doc.id}?fields=webViewLink`,
              { headers: { Authorization: `Bearer ${accessToken}` } },
            );
            if (fr.ok) driveWebViewLink = (await fr.json()).webViewLink;
            await supabase
              .from('incident_reports')
              .update({ drive_file_id: driveFileId })
              .eq('id', report.id);
            await supabase
              .from('user_drive_tokens')
              .update({ last_used_at: new Date().toISOString() })
              .eq('id', tokenRecord.id);
          }
        }
      }
    } catch (e) {
      console.error('Drive sync error (non-fatal):', e);
    }

    const emailResult = await sendAdminNotification(
      supabase, orgUser.org_id,
      profile?.full_name || 'Unknown', profile?.email || 'Unknown',
      incident_date, location, severity || 'minor', description,
    );

    return new Response(JSON.stringify({
      success: true,
      incident_id: report.id,
      report: { ...report, drive_file_id: driveFileId },
      drive_web_view_link: driveWebViewLink,
      emailNotificationSent: emailResult.sent,
      emailNotificationReason: emailResult.reason,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('create-incident-report error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
