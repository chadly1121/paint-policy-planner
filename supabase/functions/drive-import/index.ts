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

// Check if MIME type can be converted to Google Docs
function isConvertibleToGoogleDoc(mimeType: string): boolean {
  const convertibleTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword', // DOC
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/html',
    'application/rtf',
  ];
  return convertibleTypes.includes(mimeType);
}

// Check if already a Google Doc
function isGoogleDoc(mimeType: string): boolean {
  return mimeType === 'application/vnd.google-apps.document';
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
    const { source_file_id, target_folder_type, new_name, module_type } = body;

    if (!source_file_id || !target_folder_type) {
      return new Response(JSON.stringify({ error: 'source_file_id and target_folder_type required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      `https://www.googleapis.com/drive/v3/files/${source_file_id}?fields=name,mimeType,webViewLink`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!metadataResponse.ok) {
      throw new Error('Failed to get source file metadata');
    }

    const sourceMetadata = await metadataResponse.json();
    console.log('Source file:', sourceMetadata.name, sourceMetadata.mimeType);

    let finalFileId: string;
    let finalFileName: string;
    let wasConverted = false;
    let originalFileId: string | null = null;

    if (isGoogleDoc(sourceMetadata.mimeType)) {
      // Already a Google Doc - just copy to target folder
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
      finalFileId = copiedFile.id;
      finalFileName = copiedFile.name;
      console.log('Google Doc copied:', finalFileId, finalFileName);

    } else if (isConvertibleToGoogleDoc(sourceMetadata.mimeType)) {
      // DOCX/PDF/etc - Copy original as reference, then create converted Google Doc
      console.log('Converting non-Google format to Google Doc...');
      
      // Step 1: Copy original to target folder (keep as reference)
      const copyOriginalResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${source_file_id}/copy`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `[Original] ${sourceMetadata.name}`,
            parents: [targetFolder.drive_folder_id],
          }),
        }
      );

      if (copyOriginalResponse.ok) {
        const originalCopy = await copyOriginalResponse.json();
        originalFileId = originalCopy.id;
        console.log('Original file preserved:', originalFileId);
      }

      // Step 2: Download source content and upload as Google Doc (conversion)
      // For DOCX and similar, we can use Google Drive's import conversion
      const downloadResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${source_file_id}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!downloadResponse.ok) {
        throw new Error('Failed to download source file for conversion');
      }

      const fileContent = await downloadResponse.arrayBuffer();
      const cleanName = (new_name || sourceMetadata.name).replace(/\.(docx?|pdf|rtf|txt|md|html?)$/i, '');

      // Upload with conversion to Google Docs format
      // Using resumable upload with convert=true
      const initUploadResponse = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&convert=true`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': sourceMetadata.mimeType,
            'X-Upload-Content-Length': fileContent.byteLength.toString(),
          },
          body: JSON.stringify({
            name: cleanName,
            mimeType: 'application/vnd.google-apps.document',
            parents: [targetFolder.drive_folder_id],
          }),
        }
      );

      if (!initUploadResponse.ok) {
        // Fallback: try multipart upload with conversion
        const boundary = 'foo_bar_baz';
        const metadata = JSON.stringify({
          name: cleanName,
          mimeType: 'application/vnd.google-apps.document',
          parents: [targetFolder.drive_folder_id],
        });

        const multipartResponse = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${sourceMetadata.mimeType}\r\n\r\n${new TextDecoder().decode(fileContent)}\r\n--${boundary}--`,
          }
        );

        if (!multipartResponse.ok) {
          const error = await multipartResponse.text();
          throw new Error(`Failed to convert file: ${error}`);
        }

        const convertedFile = await multipartResponse.json();
        finalFileId = convertedFile.id;
        finalFileName = convertedFile.name;
      } else {
        // Complete resumable upload
        const uploadUrl = initUploadResponse.headers.get('Location');
        if (!uploadUrl) {
          throw new Error('No upload URL returned');
        }

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': sourceMetadata.mimeType,
            'Content-Length': fileContent.byteLength.toString(),
          },
          body: fileContent,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.text();
          throw new Error(`Failed to upload converted file: ${error}`);
        }

        const convertedFile = await uploadResponse.json();
        finalFileId = convertedFile.id;
        finalFileName = convertedFile.name;
      }

      wasConverted = true;
      console.log('File converted to Google Doc:', finalFileId, finalFileName);

    } else {
      return new Response(JSON.stringify({ 
        error: `Unsupported file type: ${sourceMetadata.mimeType}. Please select a Google Doc, DOCX, PDF, or text file.` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the web view link for the final file
    const finalMetadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${finalFileId}?fields=webViewLink`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    let webViewLink = null;
    if (finalMetadataResponse.ok) {
      const finalMeta = await finalMetadataResponse.json();
      webViewLink = finalMeta.webViewLink;
    }

    // Update last_used_at
    await supabase
      .from('user_drive_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    return new Response(JSON.stringify({
      success: true,
      file_id: finalFileId,
      file_name: finalFileName,
      web_view_link: webViewLink,
      target_folder_id: targetFolder.drive_folder_id,
      target_folder_type,
      was_converted: wasConverted,
      original_file_id: originalFileId,
      original_mime_type: sourceMetadata.mimeType,
      module_type: module_type || 'sop',
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
