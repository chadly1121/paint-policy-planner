import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_ENCRYPTION_KEY = Deno.env.get('DRIVE_ENCRYPTION_KEY')!;

// NOTE: Auto-template generation was removed in Sprint 3 (May 2026).
// Admins now upload their own .docx templates to the appropriate folder
// instead of having outdated placeholder Google Docs auto-created.

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
  
  // If token expires in less than 5 minutes, refresh it
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
    
    // Re-fetch the token
    const { data: refreshedToken } = await supabase
      .from('user_drive_tokens')
      .select('access_token_encrypted')
      .eq('id', tokenRecord.id)
      .single();
    
    return await decryptToken(refreshedToken.access_token_encrypted);
  }
  
  return await decryptToken(tokenRecord.access_token_encrypted);
}

// Create a folder in Google Drive
async function createDriveFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<{ id: string; name: string }> {
  const metadata: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  
  if (parentId) {
    metadata.parents = [parentId];
  }
  
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create folder: ${error}`);
  }
  
  return await response.json();
}

// createGoogleDoc helper removed — see TEMPLATE_CONTENT note above.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate user authentication
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

    // Get user's org
    const { data: orgUser, error: orgError } = await userSupabase
      .from('org_users')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (orgError || !orgUser) {
      return new Response(JSON.stringify({ error: 'User not in organization' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only admins can create folder structure
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

    // Get primary token for org
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

    // Check if root folder already exists
    const { data: existingRoot } = await supabase
      .from('org_drive_folders')
      .select('*')
      .eq('org_id', orgUser.org_id)
      .eq('folder_type', 'root')
      .single();

    let rootFolderId: string;
    let rootFolderName: string;
    const createdFolders: any[] = [];

    if (existingRoot) {
      rootFolderId = existingRoot.drive_folder_id;
      rootFolderName = existingRoot.drive_folder_name;
      console.log('Using existing root folder:', rootFolderId);
    } else {
      // Create root folder: SOPed-{org_id}
      rootFolderName = `SOPed-${orgUser.org_id}`;
      const rootFolder = await createDriveFolder(accessToken, rootFolderName);
      rootFolderId = rootFolder.id;
      
      // Get org_user_id for created_by
      const { data: orgUserRecord } = await supabase
        .from('org_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('org_id', orgUser.org_id)
        .single();

      // Store root folder
      await supabase.from('org_drive_folders').insert({
        org_id: orgUser.org_id,
        folder_type: 'root',
        drive_folder_id: rootFolderId,
        drive_folder_name: rootFolderName,
        created_by: orgUserRecord?.id,
      });

      createdFolders.push({ type: 'root', id: rootFolderId, name: rootFolderName });
      console.log('Created root folder:', rootFolderId);
    }

    // Create module subfolders
    const moduleFolders = ['SOPs', 'Policies', 'Safety', 'Training', 'Disciplinary', 'Forms', 'MSDS', 'Incident-Reports'];
    
    for (const moduleName of moduleFolders) {
      const folderType = moduleName.toLowerCase();
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('org_drive_folders')
        .select('id')
        .eq('org_id', orgUser.org_id)
        .eq('folder_type', folderType)
        .single();

      if (!existing) {
        const folder = await createDriveFolder(accessToken, moduleName, rootFolderId);
        
        const { data: orgUserRecord } = await supabase
          .from('org_users')
          .select('id')
          .eq('user_id', user.id)
          .eq('org_id', orgUser.org_id)
          .single();

        const { data: rootRecord } = await supabase
          .from('org_drive_folders')
          .select('id')
          .eq('org_id', orgUser.org_id)
          .eq('folder_type', 'root')
          .single();

        await supabase.from('org_drive_folders').insert({
          org_id: orgUser.org_id,
          folder_type: folderType,
          drive_folder_id: folder.id,
          drive_folder_name: moduleName,
          parent_folder_id: rootRecord?.id,
          created_by: orgUserRecord?.id,
        });

        createdFolders.push({ type: folderType, id: folder.id, name: moduleName });
        console.log('Created folder:', moduleName);
      }
    }

    // Create Employee-Credentials folder
    const { data: existingCredentials } = await supabase
      .from('org_drive_folders')
      .select('id')
      .eq('org_id', orgUser.org_id)
      .eq('folder_type', 'employee-credentials')
      .single();

    if (!existingCredentials) {
      const credentialsFolder = await createDriveFolder(accessToken, 'Employee-Credentials', rootFolderId);
      
      const { data: orgUserRecord } = await supabase
        .from('org_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('org_id', orgUser.org_id)
        .single();

      const { data: rootRecord } = await supabase
        .from('org_drive_folders')
        .select('id')
        .eq('org_id', orgUser.org_id)
        .eq('folder_type', 'root')
        .single();

      await supabase.from('org_drive_folders').insert({
        org_id: orgUser.org_id,
        folder_type: 'employee-credentials',
        drive_folder_id: credentialsFolder.id,
        drive_folder_name: 'Employee-Credentials',
        parent_folder_id: rootRecord?.id,
        created_by: orgUserRecord?.id,
      });

      createdFolders.push({ type: 'employee-credentials', id: credentialsFolder.id, name: 'Employee-Credentials' });
    }

    // Template auto-generation removed in Sprint 3 — admins upload their own
    // .docx templates to each module folder.
    const createdTemplates: any[] = [];

    return new Response(JSON.stringify({ 
      success: true,
      root_folder_id: rootFolderId,
      root_folder_name: rootFolderName,
      created_folders: createdFolders,
      created_templates: createdTemplates,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in drive-create-folders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
