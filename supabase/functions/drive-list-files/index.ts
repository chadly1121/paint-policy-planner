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

// Get valid access token
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

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  size?: string;
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
    const { folder_type } = body; // e.g., "sops", "policies", "safety", "training", "disciplinary"

    if (!folder_type) {
      return new Response(JSON.stringify({ error: 'folder_type required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's org
    const { data: orgUser, error: orgError } = await userSupabase
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get the folder record for this module
    const { data: folderRecord, error: folderError } = await supabase
      .from('org_drive_folders')
      .select('id, drive_folder_id, drive_folder_name')
      .eq('org_id', orgUser.org_id)
      .eq('folder_type', folder_type)
      .single();

    if (folderError || !folderRecord) {
      return new Response(JSON.stringify({ 
        error: 'Folder not found',
        folder_type,
        files: [],
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // First verify the folder still exists and is accessible
    const folderCheckResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderRecord.drive_folder_id}?fields=id,name,trashed`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!folderCheckResponse.ok) {
      const status = folderCheckResponse.status;
      console.error(`Folder check failed with status ${status}`);
      if (status === 404) {
        // Folder was deleted - try to find it by name in the root folder
        const rootFolder = await supabase
          .from('org_drive_folders')
          .select('drive_folder_id')
          .eq('org_id', orgUser.org_id)
          .eq('folder_type', 'root')
          .single();
        
        if (rootFolder.data) {
          // Search for folder by name under root
          const folderNameMap: Record<string, string> = {
            'sops': 'SOPs',
            'policies': 'Policies', 
            'safety': 'Safety',
            'training': 'Training',
            'disciplinary': 'Disciplinary'
          };
          const expectedName = folderNameMap[folder_type] || folder_type;
          
          const searchQuery = encodeURIComponent(
            `'${rootFolder.data.drive_folder_id}' in parents and name = '${expectedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
          );
          const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${searchQuery}&fields=files(id,name)`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.files && searchData.files.length > 0) {
              const correctFolderId = searchData.files[0].id;
              console.log(`Found correct folder: ${correctFolderId}, updating database...`);
              
              // Update the database with correct folder ID
              await supabase
                .from('org_drive_folders')
                .update({ drive_folder_id: correctFolderId })
                .eq('id', folderRecord.id);
              
              // Use the corrected folder ID
              folderRecord.drive_folder_id = correctFolderId;
            }
          }
        }
      }
    } else {
      const folderInfo = await folderCheckResponse.json();
      console.log(`Folder verified: ${folderInfo.name} (trashed: ${folderInfo.trashed})`);
    }

    // List files in the folder  
    const query = `'${folderRecord.drive_folder_id}' in parents and trashed = false`;
    const encodedQuery = encodeURIComponent(query);
    const fields = 'files(id,name,mimeType,createdTime,modifiedTime,webViewLink,size)';
    
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodedQuery}&fields=${fields}&orderBy=name`;
    console.log(`Querying Drive with folder ID: ${folderRecord.drive_folder_id}`);
    
    const listResponse = await fetch(listUrl, { 
      headers: { Authorization: `Bearer ${accessToken}` } 
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error(`Drive API error: ${listResponse.status} - ${errorText}`);
      throw new Error(`Failed to list files: ${errorText}`);
    }

    const listData = await listResponse.json();
    const files: DriveFile[] = listData.files || [];

    console.log(`Listed ${files.length} files in ${folder_type} folder`);
    
    // If still empty, search for any folder named "Policies" anywhere and log it
    if (files.length === 0 && folder_type === 'policies') {
      const globalSearch = encodeURIComponent(`name = 'Policies' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
      const globalSearchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${globalSearch}&fields=files(id,name,parents)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (globalSearchResponse.ok) {
        const globalData = await globalSearchResponse.json();
        console.log(`Found ${globalData.files?.length || 0} folders named "Policies" in Drive:`, JSON.stringify(globalData.files));
      }
      
      // Also search for ANY recent documents to help debug
      const recentDocsQuery = encodeURIComponent(`mimeType = 'application/vnd.google-apps.document' and trashed = false`);
      const recentDocsResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${recentDocsQuery}&fields=files(id,name,parents)&orderBy=modifiedTime desc&pageSize=20`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (recentDocsResponse.ok) {
        const recentData = await recentDocsResponse.json();
        console.log(`Recent 20 docs in Drive:`, JSON.stringify(recentData.files));
      }
    }

    // Update last_used_at
    await supabase
      .from('user_drive_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    return new Response(JSON.stringify({
      success: true,
      folder_type,
      folder_id: folderRecord.drive_folder_id,
      folder_name: folderRecord.drive_folder_name,
      files,
      file_count: files.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in drive-list-files:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
