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
    const { source_file_id, target_folder_type, new_name } = body;

    if (!source_file_id || !target_folder_type) {
      return new Response(JSON.stringify({ error: 'source_file_id and target_folder_type required' }), {
        status: 400,
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
      .eq('folder_type', target_folder_type)
      .single();

    if (folderError || !targetFolder) {
      return new Response(JSON.stringify({ error: `Target folder '${target_folder_type}' not found` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getValidAccessToken(tokenRecord, supabase);

    // Get source file metadata
    const metadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${source_file_id}?fields=name,mimeType`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!metadataResponse.ok) {
      throw new Error('Failed to get source file metadata');
    }

    const sourceMetadata = await metadataResponse.json();
    console.log('Source file:', sourceMetadata.name, sourceMetadata.mimeType);

    // Copy file to target folder
    const copyResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${source_file_id}/copy`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: new_name || sourceMetadata.name,
          parents: [targetFolder.drive_folder_id],
        }),
      }
    );

    if (!copyResponse.ok) {
      const error = await copyResponse.text();
      throw new Error(`Failed to copy file: ${error}`);
    }

    const copiedFile = await copyResponse.json();
    console.log('File copied:', copiedFile.id, copiedFile.name);

    // If source was not a Google Doc, convert it
    let finalFileId = copiedFile.id;
    let finalMimeType = copiedFile.mimeType;

    // If it's a non-Google format, we may need to extract content
    let extractedContent = null;
    if (copiedFile.mimeType === 'application/vnd.google-apps.document') {
      // Export as plain text for content extraction
      const contentResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${copiedFile.id}/export?mimeType=text/plain`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (contentResponse.ok) {
        extractedContent = await contentResponse.text();
      }
    }

    // Update last_used_at
    await supabase
      .from('user_drive_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    return new Response(JSON.stringify({
      success: true,
      file_id: finalFileId,
      file_name: copiedFile.name,
      mime_type: finalMimeType,
      source_file_id,
      target_folder_type,
      extracted_content: extractedContent ? extractedContent.substring(0, 5000) : null,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in drive-import:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
