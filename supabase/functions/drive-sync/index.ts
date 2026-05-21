import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_ENCRYPTION_KEY = Deno.env.get('DRIVE_ENCRYPTION_KEY')!;

// Module type → org_drive_folders.folder_type
const MODULE_FOLDER_MAP: Record<string, string> = {
  'sops': 'sops',
  'policies': 'policies',
  'safety': 'safety',
  'training': 'training',
  'disciplinary': 'disciplinary',
  'forms': 'forms',
};

// Filename prefix (ROP-XXX-NNN) → expected module type
const PREFIX_TO_MODULE: Record<string, string> = {
  POL: 'policies',
  SOP: 'sops',
  FRM: 'forms',
  SAF: 'safety',
  TRN: 'training',
  DSC: 'disciplinary',
};

// Parse "ROP-XXX-NNN..." from a filename. Returns { id, prefix } or null.
function parseDocIdExternal(name: string): { id: string; prefix: string } | null {
  const stripped = name.replace(/\.[^/.]+$/, '');
  const m = stripped.match(/^ROP-(POL|SOP|FRM|SAF|TRN|DSC)-(\d{3})/i);
  if (!m) return null;
  const prefix = m[1].toUpperCase();
  return { id: `ROP-${prefix}-${m[2]}`, prefix };
}

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
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, keyMaterial, encrypted);
  return decoder.decode(decrypted);
}

async function getValidAccessToken(tokenRecord: any, supabase: any): Promise<string> {
  const expiresAt = new Date(tokenRecord.token_expires_at);
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const refreshResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/drive-token-refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_id: tokenRecord.id }),
      }
    );
    if (!refreshResponse.ok) throw new Error('Failed to refresh token');
    const { data: refreshedToken } = await supabase
      .from('user_drive_tokens')
      .select('access_token_encrypted')
      .eq('id', tokenRecord.id)
      .single();
    return await decryptToken(refreshedToken.access_token_encrypted);
  }
  return await decryptToken(tokenRecord.access_token_encrypted);
}

interface SyncResult {
  module_type: string;
  files_found: number;
  records_created: number;
  records_updated: number;
  records_marked_removed: number;
  misplacements: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { module_type, dry_run = false } = body;

    const { data: orgUser, error: orgError } = await userSupabase
      .from('org_users')
      .select('org_id, role, id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (orgError || !orgUser) {
      return new Response(JSON.stringify({ error: 'User not in organization' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (orgUser.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tokenRecord, error: tokenError } = await supabase
      .from('user_drive_tokens')
      .select('*')
      .eq('org_id', orgUser.org_id)
      .eq('is_active', true)
      .eq('is_primary', true)
      .single();

    if (tokenError || !tokenRecord) {
      return new Response(JSON.stringify({ error: 'No active Drive connection' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getValidAccessToken(tokenRecord, supabase);

    const modulesToSync = module_type ? [module_type] : Object.keys(MODULE_FOLDER_MAP);
    const results: SyncResult[] = [];
    const misplacementWarnings: Array<Record<string, unknown>> = [];

    for (const moduleType of modulesToSync) {
      const folderType = MODULE_FOLDER_MAP[moduleType];
      if (!folderType) continue;

      const { data: folderRecord } = await supabase
        .from('org_drive_folders')
        .select('drive_folder_id')
        .eq('org_id', orgUser.org_id)
        .eq('folder_type', folderType)
        .single();

      if (!folderRecord) {
        console.log(`No folder found for ${moduleType}, skipping`);
        continue;
      }

      const query = encodeURIComponent(`'${folderRecord.drive_folder_id}' in parents and trashed = false`);
      const fields = 'files(id,name,mimeType,createdTime,modifiedTime)';

      const listResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!listResponse.ok) {
        console.error(`Failed to list files for ${moduleType}`);
        continue;
      }
      const listData = await listResponse.json();
      const driveFiles = listData.files || [];
      const driveFileIds = new Set(driveFiles.map((f: any) => f.id));

      let recordsCreated = 0;
      let recordsUpdated = 0;
      let recordsMarkedRemoved = 0;
      let misplacements = 0;

      // Detect filename/folder misplacement (e.g. ROP-SAF-005 inside Policies folder)
      for (const file of driveFiles) {
        const parsed = parseDocIdExternal(file.name);
        if (!parsed) continue;
        const expectedModule = PREFIX_TO_MODULE[parsed.prefix];
        if (expectedModule && expectedModule !== moduleType) {
          misplacements++;
          misplacementWarnings.push({
            doc_id_external: parsed.id,
            file_id: file.id,
            file_name: file.name,
            current_folder: moduleType,
            expected_folder: expectedModule,
          });
          console.warn(
            `MISPLACEMENT: ${file.name} (${parsed.id}) is in '${moduleType}' folder but prefix suggests '${expectedModule}'`
          );
        }
      }

      if (moduleType === 'forms') {
        // Forms have their own table — drive-sync populates company_forms metadata.
        const { data: existingForms } = await supabase
          .from('company_forms')
          .select('id, drive_file_id, title, is_active, doc_id_external')
          .eq('user_id', user.id)
          .not('drive_file_id', 'is', null);
        const existingByDriveId = new Map(
          (existingForms || []).map((s: any) => [s.drive_file_id, s])
        );

        if (!dry_run) {
          for (const file of driveFiles) {
            const baseTitle = file.name.replace(/\.[^/.]+$/, '');
            const parsed = parseDocIdExternal(file.name);
            const docIdExternal = parsed?.id ?? null;
            const existing = existingByDriveId.get(file.id);
            if (existing) {
              const patch: Record<string, unknown> = {};
              if (existing.title !== baseTitle) patch.title = baseTitle;
              if (existing.doc_id_external !== docIdExternal) patch.doc_id_external = docIdExternal;
              if (!existing.is_active) patch.is_active = true;
              if (Object.keys(patch).length > 0) {
                await supabase.from('company_forms').update(patch).eq('id', existing.id);
                recordsUpdated++;
              }
            } else {
              await supabase.from('company_forms').insert({
                user_id: user.id,
                source_form_key: file.id,
                title: baseTitle,
                drive_file_id: file.id,
                drive_folder_id: folderRecord.drive_folder_id,
                doc_id_external: docIdExternal,
                is_active: true,
              });
              recordsCreated++;
            }
          }
          for (const [driveId, form] of existingByDriveId) {
            if (!driveFileIds.has(driveId) && form.is_active) {
              await supabase.from('company_forms').update({ is_active: false }).eq('id', form.id);
              recordsMarkedRemoved++;
            }
          }
        }
      } else {
        // Existing modules: metadata lives in `sops`.
        const { data: existingSops } = await supabase
          .from('sops')
          .select('id, drive_file_id, title, status, doc_id_external')
          .eq('org_id', orgUser.org_id)
          .not('drive_file_id', 'is', null);
        const existingByDriveId = new Map(
          (existingSops || []).map((s: any) => [s.drive_file_id, s])
        );

        if (!dry_run) {
          for (const file of driveFiles) {
            const baseTitle = file.name.replace(/\.[^/.]+$/, '');
            const parsed = parseDocIdExternal(file.name);
            const docIdExternal = parsed?.id ?? null;
            const existing = existingByDriveId.get(file.id);

            if (existing) {
              const patch: Record<string, unknown> = {};
              if (existing.title !== baseTitle) patch.title = baseTitle;
              if (existing.doc_id_external !== docIdExternal) patch.doc_id_external = docIdExternal;
              if (existing.status !== 'active') patch.status = 'active';
              if (Object.keys(patch).length > 0) {
                patch.updated_at = new Date().toISOString();
                await supabase.from('sops').update(patch).eq('id', existing.id);
                recordsUpdated++;
              }
            } else {
              await supabase.from('sops').insert({
                org_id: orgUser.org_id,
                source: 'org',
                title: baseTitle,
                drive_file_id: file.id,
                content_md: null,
                status: 'active',
                created_by: orgUser.id,
                updated_by: orgUser.id,
                doc_id_external: docIdExternal,
              });
              recordsCreated++;
            }
          }

          for (const [driveId, sop] of existingByDriveId) {
            if (!driveFileIds.has(driveId) && sop.status !== 'removed_from_drive') {
              await supabase.from('sops').update({ status: 'removed_from_drive' }).eq('id', sop.id);
              recordsMarkedRemoved++;
            }
          }
        }
      }

      results.push({
        module_type: moduleType,
        files_found: driveFiles.length,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        records_marked_removed: recordsMarkedRemoved,
        misplacements,
      });

      console.log(
        `Synced ${moduleType}: ${driveFiles.length} files, ${recordsCreated} created, ${recordsUpdated} updated, ${recordsMarkedRemoved} removed, ${misplacements} misplaced`
      );
    }

    if (!dry_run) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'drive_sync',
        table_name: 'sops',
        new_data: { results, synced_at: new Date().toISOString() },
      });

      // Surface misplacements as their own audit_log rows so admins can see/fix them.
      if (misplacementWarnings.length > 0) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'drive_sync_misplacement_warning',
          table_name: 'sops',
          new_data: {
            org_id: orgUser.org_id,
            warnings: misplacementWarnings,
            detected_at: new Date().toISOString(),
          },
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      dry_run,
      results,
      misplacement_warnings: misplacementWarnings,
      synced_at: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in drive-sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
