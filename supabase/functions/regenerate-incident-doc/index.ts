import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildIncidentDocBody,
  decryptDriveToken,
  type IncidentAttachment,
  type IncidentRecord,
} from "../_shared/incident-doc-body.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_ENCRYPTION_KEY = Deno.env.get('DRIVE_ENCRYPTION_KEY')!;

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await userSupabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { incident_id } = await req.json();
    if (!incident_id) {
      return new Response(JSON.stringify({ error: 'incident_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: incident, error: incErr } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('id', incident_id)
      .single();
    if (incErr || !incident) {
      return new Response(JSON.stringify({ error: 'Incident not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin check
    const { data: adminRow } = await supabase
      .from('org_users')
      .select('role, is_active')
      .eq('user_id', user.id)
      .eq('org_id', incident.org_id)
      .eq('is_active', true)
      .maybeSingle();
    if (!adminRow || adminRow.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!incident.drive_file_id) {
      return new Response(JSON.stringify({ error: 'Incident has no Drive file' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Profile / reporter
    const { data: reporter } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', incident.reported_by)
      .maybeSingle();

    let reviewerName: string | null = null;
    if (incident.reviewed_by) {
      const { data: rev } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', incident.reviewed_by)
        .maybeSingle();
      reviewerName = rev?.full_name || null;
    }

    const { data: attachments } = await supabase
      .from('incident_report_attachments')
      .select('file_name, mime_type, size_bytes, drive_web_view_link')
      .eq('incident_id', incident_id)
      .order('uploaded_at', { ascending: true });

    // Determine report number (ordinal in org, 0-indexed to match create flow)
    const { count } = await supabase
      .from('incident_reports')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', incident.org_id)
      .lt('created_at', incident.created_at);

    const body = buildIncidentDocBody(
      incident as IncidentRecord,
      (attachments || []) as IncidentAttachment[],
      {
        reportNumber: count ?? 0,
        reporterName: reporter?.full_name || 'Unknown',
        reporterEmail: reporter?.email || 'Unknown',
        reviewerName,
      },
    );

    const { data: tokenRecord } = await supabase
      .from('user_drive_tokens')
      .select('*')
      .eq('org_id', incident.org_id)
      .eq('is_active', true)
      .eq('is_primary', true)
      .maybeSingle();
    if (!tokenRecord) {
      return new Response(JSON.stringify({ error: 'No Drive connection' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const accessToken = await getValidAccessToken(tokenRecord, supabase);

    // Get current end index then replace all content (range 1..endIndex-1)
    const docRes = await fetch(
      `https://docs.googleapis.com/v1/documents/${incident.drive_file_id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!docRes.ok) {
      const t = await docRes.text();
      return new Response(JSON.stringify({ error: `Failed to fetch doc: ${t}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const doc = await docRes.json();
    const content = doc.body?.content || [];
    let endIndex = 1;
    for (const el of content) {
      if (typeof el.endIndex === 'number') endIndex = Math.max(endIndex, el.endIndex);
    }

    const requests: any[] = [];
    if (endIndex > 2) {
      requests.push({
        deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } },
      });
    }
    requests.push({ insertText: { location: { index: 1 }, text: body } });

    const updateRes = await fetch(
      `https://docs.googleapis.com/v1/documents/${incident.drive_file_id}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      },
    );
    if (!updateRes.ok) {
      const t = await updateRes.text();
      return new Response(JSON.stringify({ error: `Doc update failed: ${t}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('regenerate-incident-doc error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
