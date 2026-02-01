import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_ENCRYPTION_KEY = Deno.env.get('DRIVE_ENCRYPTION_KEY')!;

// Module type to folder type mapping
const MODULE_FOLDER_MAP: Record<string, string> = {
  'sops': 'sops',
  'policies': 'policies',
  'safety': 'safety',
  'training': 'training',
  'disciplinary': 'disciplinary',
};

// Decryption helper
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

// Get valid access token
async function getValidAccessToken(tokenRecord: any, supabase: any): Promise<string> {
  const expiresAt = new Date(tokenRecord.token_expires_at);
  const now = new Date();
  
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
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

interface SyncResult {
  module_type: string;
  files_found: number;
  records_created: number;
  records_updated: number;
  records_marked_removed: number;
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

    const body = await req.json().catch(() => ({}));
    const { module_type, dry_run = false } = body; // optional: sync specific module or all

    // Get user's org and verify admin
    const { data: orgUser, error: orgError } = await userSupabase
      .from('org_users')
      .select('org_id, role, id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (orgError || !orgUser) {
      return new Response(JSON.stringify({ error: 'User not in organization' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only admins can sync
    if (orgUser.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get primary token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('user_drive_tokens')
      .select('*')
      .eq('org_id', orgUser.org_id)
      .eq('is_active', true)
      .eq('is_primary', true)
      .single();

    if (tokenError || !tokenRecord) {
      return new Response(JSON.stringify({ error: 'No active Drive connection' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getValidAccessToken(tokenRecord, supabase);

    // Determine which modules to sync
    const modulesToSync = module_type 
      ? [module_type] 
      : Object.keys(MODULE_FOLDER_MAP);

    const results: SyncResult[] = [];

    for (const moduleType of modulesToSync) {
      const folderType = MODULE_FOLDER_MAP[moduleType];
      if (!folderType) continue;

      // Get folder ID
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

      // List files in Drive folder
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

      // Get existing SOPs for this org with drive_file_id
      const { data: existingSops } = await supabase
        .from('sops')
        .select('id, drive_file_id, title, status')
        .eq('org_id', orgUser.org_id)
        .not('drive_file_id', 'is', null);

      const existingByDriveId = new Map(
        (existingSops || []).map((s: any) => [s.drive_file_id, s])
      );

      if (!dry_run) {
        // Upsert records for each Drive file
        for (const file of driveFiles) {
          const existing = existingByDriveId.get(file.id);
          
          if (existing) {
            // Update title if changed
            if (existing.title !== file.name.replace(/\.[^/.]+$/, '')) {
              await supabase
                .from('sops')
                .update({ 
                  title: file.name.replace(/\.[^/.]+$/, ''),
                  status: 'active',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);
              recordsUpdated++;
            } else if (existing.status === 'removed_from_drive') {
              // Restore if it was marked removed
              await supabase
                .from('sops')
                .update({ status: 'active' })
                .eq('id', existing.id);
              recordsUpdated++;
            }
          } else {
            // Create new metadata record
            await supabase.from('sops').insert({
              org_id: orgUser.org_id,
              source: 'org',
              title: file.name.replace(/\.[^/.]+$/, ''),
              drive_file_id: file.id,
              content_md: null, // No content stored locally
              status: 'active',
              created_by: orgUser.id,
              updated_by: orgUser.id,
            });
            recordsCreated++;
          }
        }

        // Mark records as removed if file no longer in Drive
        for (const [driveId, sop] of existingByDriveId) {
          if (!driveFileIds.has(driveId) && sop.status !== 'removed_from_drive') {
            await supabase
              .from('sops')
              .update({ status: 'removed_from_drive' })
              .eq('id', sop.id);
            recordsMarkedRemoved++;
          }
        }
      }

      results.push({
        module_type: moduleType,
        files_found: driveFiles.length,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        records_marked_removed: recordsMarkedRemoved,
      });

      console.log(`Synced ${moduleType}: ${driveFiles.length} files, ${recordsCreated} created, ${recordsUpdated} updated, ${recordsMarkedRemoved} marked removed`);
    }

    // Log audit event
    if (!dry_run) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'drive_sync',
        table_name: 'sops',
        new_data: { results, synced_at: new Date().toISOString() },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      dry_run,
      results,
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
