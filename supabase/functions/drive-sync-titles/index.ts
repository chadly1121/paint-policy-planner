import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_ENCRYPTION_KEY = Deno.env.get('DRIVE_ENCRYPTION_KEY')!;

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
    const refreshInvoke = await supabase.functions.invoke('drive-token-refresh', {
      body: { token_id: tokenRecord.id },
    });

    if (refreshInvoke.error) {
      throw new Error(`Failed to refresh token: ${refreshInvoke.error.message}`);
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

// Extract title from document first line - matches pattern like "SAFETY-1 ( My Title )"
function extractTitleFromHeader(firstLine: string): string | null {
  // Match patterns like "SOP-1 ( Title )", "CO-POL-2 ( Name )", "SAFETY-3 ( Description )"
  const pattern = /^(SOP-\d+|CO-POL-\d+|SAFETY-\d+|TRAIN-\d+|DISC-\d+)\s*\(\s*(.+?)\s*\)$/i;
  const match = firstLine.trim().match(pattern);
  
  if (match) {
    const prefix = match[1].toUpperCase();
    const title = match[2].trim();
    // Only return if user has replaced the placeholder
    if (title && title !== 'INSERT NAME') {
      return `${prefix} ( ${title} )`;
    }
  }
  return null;
}

// Get document content (first line only for efficiency)
async function getDocumentFirstLine(accessToken: string, fileId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://docs.googleapis.com/v1/documents/${fileId}?fields=body.content`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.warn(`Failed to get document ${fileId}:`, await response.text());
      return null;
    }

    const doc = await response.json();
    const content = doc.body?.content || [];
    
    // Extract text from first paragraph
    for (const element of content) {
      if (element.paragraph?.elements) {
        for (const elem of element.paragraph.elements) {
          if (elem.textRun?.content) {
            const text = elem.textRun.content.trim();
            if (text) return text;
          }
        }
      }
    }
    return null;
  } catch (err) {
    console.error(`Error getting document ${fileId}:`, err);
    return null;
  }
}

// Rename a file in Drive
async function renameFile(accessToken: string, fileId: string, newName: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      }
    );

    if (!response.ok) {
      console.warn(`Failed to rename file ${fileId}:`, await response.text());
      return false;
    }
    
    console.log(`Renamed file ${fileId} to "${newName}"`);
    return true;
  } catch (err) {
    console.error(`Error renaming file ${fileId}:`, err);
    return false;
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

    const body = await req.json();
    const { folder_type } = body;

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

    // Get target folder
    const { data: targetFolder, error: folderError } = await supabase
      .from('org_drive_folders')
      .select('drive_folder_id')
      .eq('org_id', orgUser.org_id)
      .eq('folder_type', folder_type)
      .single();

    if (folderError || !targetFolder) {
      return new Response(JSON.stringify({ error: `${folder_type} folder not found` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getValidAccessToken(tokenRecord, supabase);

    // List all Google Docs in the folder
    const listUrl = new URL('https://www.googleapis.com/drive/v3/files');
    listUrl.searchParams.set('q', `'${targetFolder.drive_folder_id}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`);
    listUrl.searchParams.set('fields', 'files(id,name)');
    listUrl.searchParams.set('pageSize', '100');

    const listResponse = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResponse.ok) {
      throw new Error(`Failed to list files: ${await listResponse.text()}`);
    }

    const { files } = await listResponse.json();
    const results: Array<{ fileId: string; oldName: string; newName: string; success: boolean }> = [];

    // Process each file
    for (const file of files || []) {
      // Skip templates
      if (file.name.startsWith('_TEMPLATE')) continue;

      // Get document first line
      const firstLine = await getDocumentFirstLine(accessToken, file.id);
      if (!firstLine) continue;

      // Extract new title from header
      const newTitle = extractTitleFromHeader(firstLine);
      if (!newTitle) continue;

      // Check if rename is needed - also ensure we're not creating duplicates
      // e.g. if filename is already "SOP-1 ( Name )" don't rename to "SOP-4 SOP-1 ( Name )"
      const currentHasPrefix = /^(SOP-\d+|CO-POL-\d+|SAFETY-\d+|TRAIN-\d+|DISC-\d+)/i.test(file.name);
      const newTitleNormalized = newTitle.trim();
      const fileNameNormalized = file.name.trim();
      
      // Only rename if the normalized versions differ and won't create a double-prefix
      if (newTitleNormalized !== fileNameNormalized && !currentHasPrefix) {
        const success = await renameFile(accessToken, file.id, newTitle);
        results.push({
          fileId: file.id,
          oldName: file.name,
          newName: newTitle,
          success,
        });
      } else if (newTitleNormalized !== fileNameNormalized && currentHasPrefix) {
        // File already has a prefix - only rename if the extracted title is truly different
        // (meaning user intentionally changed the header)
        const success = await renameFile(accessToken, file.id, newTitle);
        results.push({
          fileId: file.id,
          oldName: file.name,
          newName: newTitle,
          success,
        });
      }
    }

    console.log(`Sync complete: ${results.length} files renamed`);

    return new Response(JSON.stringify({
      success: true,
      renamed: results.filter(r => r.success).length,
      details: results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in drive-sync-titles:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
