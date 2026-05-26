import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptDriveToken } from "../_shared/incident-doc-body.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_ENCRYPTION_KEY = Deno.env.get('DRIVE_ENCRYPTION_KEY')!;
const MAX_SIZE = 25 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'application/pdf',
]);

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

async function findOrCreateAttachmentsFolder(
  accessToken: string,
  parentFolderId: string,
  folderName: string,
): Promise<string> {
  // search first
  const q = encodeURIComponent(
    `'${parentFolderId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files?.length) return data.files[0].id;
  }
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    }),
  });
  if (!createRes.ok) throw new Error(`Failed to create attachments folder: ${await createRes.text()}`);
  const folder = await createRes.json();
  return folder.id;
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

    const body = await req.json();
    const { incident_id, file, file_name, mime_type } = body;
    if (!incident_id || !file || !file_name || !mime_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!ALLOWED_MIME.has(mime_type)) {
      return new Response(JSON.stringify({
        error: `File type ${mime_type} not allowed. Allowed: JPEG, PNG, HEIC, WebP, PDF.`,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Decode base64
    const cleanBase64 = file.replace(/^data:[^;]+;base64,/, '');
    const bytes = Uint8Array.from(atob(cleanBase64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'File exceeds 25MB limit' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify access to incident
    const { data: incident, error: incErr } = await supabase
      .from('incident_reports')
      .select('id, org_id, drive_file_id, location, incident_date')
      .eq('id', incident_id)
      .single();
    if (incErr || !incident) {
      return new Response(JSON.stringify({ error: 'Incident not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: ou } = await supabase
      .from('org_users')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (!ou || ou.org_id !== incident.org_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Drive token + parent folder
    const { data: tokenRecord } = await supabase
      .from('user_drive_tokens')
      .select('*')
      .eq('org_id', incident.org_id)
      .eq('is_active', true)
      .eq('is_primary', true)
      .maybeSingle();
    if (!tokenRecord) {
      return new Response(JSON.stringify({ error: 'No Google Drive connected for org' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: folderRec } = await supabase
      .from('org_drive_folders')
      .select('drive_folder_id')
      .eq('org_id', incident.org_id)
      .eq('folder_type', 'incident-reports')
      .maybeSingle();
    if (!folderRec) {
      return new Response(JSON.stringify({ error: 'Incident-Reports folder missing' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getValidAccessToken(tokenRecord, supabase);

    // Determine report number from order of creation in org
    const { count } = await supabase
      .from('incident_reports')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', incident.org_id)
      .lte('created_at', new Date().toISOString());
    const reportNumber = (count || 1) - 1;
    const subfolderName = `IR-${reportNumber}-attachments`;
    const subfolderId = await findOrCreateAttachmentsFolder(
      accessToken, folderRec.drive_folder_id, subfolderName,
    );

    // Multipart upload
    const boundary = '----lovableBoundary' + crypto.randomUUID();
    const metadata = { name: file_name, parents: [subfolderId] };
    const encoder = new TextEncoder();
    const head = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mime_type}\r\n\r\n`,
    );
    const tail = encoder.encode(`\r\n--${boundary}--`);
    const multipart = new Uint8Array(head.byteLength + bytes.byteLength + tail.byteLength);
    multipart.set(head, 0);
    multipart.set(bytes, head.byteLength);
    multipart.set(tail, head.byteLength + bytes.byteLength);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipart,
      },
    );
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Drive upload failed:', errText);
      return new Response(JSON.stringify({ error: `Drive upload failed: ${errText}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const uploaded = await uploadRes.json();

    // Insert attachment row
    const { data: attachment, error: attErr } = await supabase
      .from('incident_report_attachments')
      .insert({
        incident_id,
        uploaded_by: user.id,
        drive_file_id: uploaded.id,
        drive_web_view_link: uploaded.webViewLink,
        file_name,
        mime_type,
        size_bytes: bytes.byteLength,
      })
      .select()
      .single();
    if (attErr) {
      console.error('Failed to insert attachment row:', attErr);
      return new Response(JSON.stringify({ error: attErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ attachment }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('upload-incident-attachment error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
