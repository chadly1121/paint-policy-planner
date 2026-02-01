import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_ENCRYPTION_KEY = Deno.env.get('DRIVE_ENCRYPTION_KEY')!;

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

// Get valid access token (refresh if needed)
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

// Map module type to folder type
function getFolderType(moduleType: string): string {
  const folderMap: Record<string, string> = {
    'sop': 'sops',
    'sops': 'sops',
    'policy': 'policies',
    'policies': 'policies',
    'safety': 'safety',
    'training': 'training',
    'disciplinary': 'disciplinary',
  };
  return folderMap[moduleType] || 'sops';
}

// Create a Google Doc from content
async function createGoogleDoc(
  accessToken: string,
  folderId: string,
  title: string,
  content: string
): Promise<{ id: string; webViewLink: string }> {
  // Create the document
  const createResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: title,
        mimeType: 'application/vnd.google-apps.document',
        parents: [folderId],
      }),
    }
  );

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create document: ${error}`);
  }

  const doc = await createResponse.json();
  const docId = doc.id;

  // Add content using Google Docs API
  if (content && content.trim()) {
    const batchUpdateResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content,
              },
            },
          ],
        }),
      }
    );

    if (!batchUpdateResponse.ok) {
      console.error('Warning: Failed to add content to document');
    }
  }

  // Get the web view link
  const metadataResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${docId}?fields=webViewLink`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  let webViewLink = `https://docs.google.com/document/d/${docId}/edit`;
  if (metadataResponse.ok) {
    const metadata = await metadataResponse.json();
    webViewLink = metadata.webViewLink || webViewLink;
  }

  return { id: docId, webViewLink };
}

interface MigrationResult {
  table: string;
  id: string;
  title: string;
  success: boolean;
  driveFileId?: string;
  error?: string;
  wasAlreadyMigrated?: boolean;
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

    const body = await req.json();
    const { module_types = ['sops', 'policies', 'safety', 'training', 'disciplinary'], dry_run = false } = body;

    // Get user's org
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

    if (orgUser.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can migrate documents' }), {
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
      return new Response(JSON.stringify({ error: 'No active Drive connection. Please connect Google Drive first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getValidAccessToken(tokenRecord, supabase);

    // Get or create folders for each module type
    const folderCache: Record<string, string> = {};
    
    for (const moduleType of module_types) {
      const folderType = getFolderType(moduleType);
      const { data: folder } = await supabase
        .from('org_drive_folders')
        .select('drive_folder_id')
        .eq('org_id', orgUser.org_id)
        .eq('folder_type', folderType)
        .single();

      if (folder) {
        folderCache[folderType] = folder.drive_folder_id;
      }
    }

    // If folders don't exist, create them first
    if (Object.keys(folderCache).length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Drive folders not provisioned. Please run "Create Drive Folders" first from the Drive settings.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: MigrationResult[] = [];

    // Process each module type
    for (const moduleType of module_types) {
      const folderType = getFolderType(moduleType);
      const folderId = folderCache[folderType];

      if (!folderId) {
        console.log(`Skipping ${moduleType}: no folder found`);
        continue;
      }

      // Handle SOPs (different table structure)
      if (moduleType === 'sops') {
        // First, get org-specific SOPs
        const { data: orgSops } = await supabase
          .from('sops')
          .select('id, title, content_md, drive_file_id, org_id, source')
          .eq('org_id', orgUser.org_id)
          .eq('source', 'org')
          .eq('status', 'active');

        // Also get system SOPs (to copy into org's folder)
        const { data: systemSops } = await supabase
          .from('sops')
          .select('id, title, content_md, drive_file_id, org_id, source, system_key')
          .is('org_id', null)
          .eq('source', 'system')
          .eq('status', 'active');

        // Combine both lists
        const allSops = [...(orgSops || []), ...(systemSops || [])];

        if (allSops.length > 0) {
          for (const sop of allSops) {
            const isSystemSop = sop.source === 'system';
            
            // For system SOPs, check if we already created an org copy
            // We track this by checking if there's an org SOP forked from this system SOP
            if (isSystemSop) {
              const { data: existingFork } = await supabase
                .from('sops')
                .select('id, drive_file_id')
                .eq('org_id', orgUser.org_id)
                .eq('forked_from_sop_id', sop.id)
                .single();

              if (existingFork?.drive_file_id) {
                results.push({
                  table: 'sops (system→org)',
                  id: sop.id,
                  title: `[System] ${sop.title}`,
                  success: true,
                  driveFileId: existingFork.drive_file_id,
                  wasAlreadyMigrated: true,
                });
                continue;
              }
            }

            // Skip org SOPs that already have drive_file_id
            if (!isSystemSop && sop.drive_file_id) {
              results.push({
                table: 'sops',
                id: sop.id,
                title: sop.title,
                success: true,
                driveFileId: sop.drive_file_id,
                wasAlreadyMigrated: true,
              });
              continue;
            }

            if (dry_run) {
              results.push({
                table: isSystemSop ? 'sops (system→org)' : 'sops',
                id: sop.id,
                title: isSystemSop ? `[System] ${sop.title}` : sop.title,
                success: true,
                wasAlreadyMigrated: false,
              });
              continue;
            }

            try {
              const { id: driveFileId, webViewLink } = await createGoogleDoc(
                accessToken,
                folderId,
                sop.title,
                sop.content_md
              );

              if (isSystemSop) {
                // Create a forked org SOP that points to the Drive file
                const { error: insertError } = await supabase
                  .from('sops')
                  .insert({
                    org_id: orgUser.org_id,
                    source: 'org',
                    title: sop.title,
                    content_md: sop.content_md,
                    drive_file_id: driveFileId,
                    source_file_url: webViewLink,
                    forked_from_sop_id: sop.id,
                    status: 'active',
                    created_by: orgUser.id,
                    updated_by: orgUser.id,
                  });

                if (insertError) {
                  throw new Error(`Failed to create org copy: ${insertError.message}`);
                }
              } else {
                // Update existing org SOP with drive_file_id
                await supabase
                  .from('sops')
                  .update({ 
                    drive_file_id: driveFileId,
                    source_file_url: webViewLink 
                  })
                  .eq('id', sop.id);
              }

              results.push({
                table: isSystemSop ? 'sops (system→org)' : 'sops',
                id: sop.id,
                title: isSystemSop ? `[System] ${sop.title}` : sop.title,
                success: true,
                driveFileId,
                wasAlreadyMigrated: false,
              });
            } catch (error) {
              results.push({
                table: isSystemSop ? 'sops (system→org)' : 'sops',
                id: sop.id,
                title: isSystemSop ? `[System] ${sop.title}` : sop.title,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
        }
      }

      // Handle other module types (company_*)
      const tableMap: Record<string, string> = {
        'policies': 'company_policies',
        'safety': 'company_safety',
        'training': 'company_training',
        'disciplinary': 'company_disciplinary',
      };

      const tableName = tableMap[folderType];
      if (tableName) {
        // Query by org membership, not just user_id
        // First get all user_ids in this org
        const { data: orgMembers } = await supabase
          .from('org_users')
          .select('user_id')
          .eq('org_id', orgUser.org_id)
          .eq('is_active', true);

        const orgUserIds = orgMembers?.map(m => m.user_id) || [];

        if (orgUserIds.length > 0) {
          const { data: docs } = await supabase
            .from(tableName)
            .select('id, title, content, drive_file_id, user_id')
            .in('user_id', orgUserIds)
            .eq('is_active', true);

          if (docs) {
            for (const doc of docs) {
              // Skip if already has drive_file_id
              if (doc.drive_file_id) {
                results.push({
                  table: tableName,
                  id: doc.id,
                  title: doc.title,
                  success: true,
                  driveFileId: doc.drive_file_id,
                  wasAlreadyMigrated: true,
                });
                continue;
              }

              if (dry_run) {
                results.push({
                  table: tableName,
                  id: doc.id,
                  title: doc.title,
                  success: true,
                  wasAlreadyMigrated: false,
                });
                continue;
              }

              try {
                const { id: driveFileId } = await createGoogleDoc(
                  accessToken,
                  folderId,
                  doc.title,
                  doc.content
                );

                // Update the record with drive_file_id
                await supabase
                  .from(tableName)
                  .update({ 
                    drive_file_id: driveFileId,
                    drive_folder_id: folderId 
                  })
                  .eq('id', doc.id);

                results.push({
                  table: tableName,
                  id: doc.id,
                  title: doc.title,
                  success: true,
                  driveFileId,
                  wasAlreadyMigrated: false,
                });
              } catch (error) {
                results.push({
                  table: tableName,
                  id: doc.id,
                  title: doc.title,
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            }
          }
        }
      }
    }

    // Update last_used_at
    await supabase
      .from('user_drive_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const alreadyMigrated = results.filter(r => r.success && r.wasAlreadyMigrated === true).length;

    return new Response(JSON.stringify({
      success: true,
      dry_run,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
        already_migrated: alreadyMigrated,
        newly_migrated: successCount - alreadyMigrated,
      },
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in drive-bulk-export:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
