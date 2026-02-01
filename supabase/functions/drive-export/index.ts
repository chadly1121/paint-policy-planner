import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DRIVE_ENCRYPTION_KEY = Deno.env.get('DRIVE_ENCRYPTION_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

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
    const { file_id, format, send_email, email_to, email_subject } = body;

    if (!file_id) {
      return new Response(JSON.stringify({ error: 'file_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const exportFormat = format || 'docx';
    const mimeTypes: Record<string, string> = {
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'pdf': 'application/pdf',
      'text': 'text/plain',
    };

    if (!mimeTypes[exportFormat]) {
      return new Response(JSON.stringify({ error: 'Invalid format. Use docx, pdf, or text' }), {
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

    // Get file metadata
    const metadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file_id}?fields=name,mimeType`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!metadataResponse.ok) {
      throw new Error('Failed to get file metadata');
    }

    const fileMetadata = await metadataResponse.json();
    console.log('Exporting file:', fileMetadata.name, 'as', exportFormat);

    // Export file
    const exportResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file_id}/export?mimeType=${encodeURIComponent(mimeTypes[exportFormat])}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!exportResponse.ok) {
      const error = await exportResponse.text();
      throw new Error(`Failed to export file: ${error}`);
    }

    // For text format, return content directly without base64 encoding
    if (exportFormat === 'text') {
      const textContent = await exportResponse.text();
      
      // Update last_used_at
      await supabase
        .from('user_drive_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', tokenRecord.id);

      return new Response(JSON.stringify({
        success: true,
        file_name: fileMetadata.name,
        format: 'text',
        content: textContent,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fileBuffer = await exportResponse.arrayBuffer();
    const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    const fileName = `${fileMetadata.name.replace(/\.[^/.]+$/, '')}.${exportFormat}`;

    console.log('File exported, size:', fileBuffer.byteLength, 'bytes');

    // Update last_used_at
    await supabase
      .from('user_drive_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    // If send_email requested
    if (send_email && email_to) {
      if (!RESEND_API_KEY) {
        return new Response(JSON.stringify({ 
          error: 'Email sending not configured',
          file_exported: true,
          file_name: fileName,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const resend = new Resend(RESEND_API_KEY);
        
        // Get user profile for from name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        const emailResult = await resend.emails.send({
          from: 'SOPed <notifications@soped.ai>',
          to: Array.isArray(email_to) ? email_to : [email_to],
          subject: email_subject || `Document: ${fileName}`,
          html: `
            <h2>Document Attached</h2>
            <p>Please find the attached document: <strong>${fileName}</strong></p>
            <p>Sent by ${profile?.full_name || 'SOPed User'}</p>
          `,
          attachments: [
            {
              filename: fileName,
              content: fileBase64,
            },
          ],
        });

        console.log('Email sent:', emailResult);

        return new Response(JSON.stringify({
          success: true,
          file_name: fileName,
          format: exportFormat,
          size_bytes: fileBuffer.byteLength,
          email_sent: true,
          email_to,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (emailError: any) {
        console.error('Email error:', emailError);
        return new Response(JSON.stringify({
          success: true,
          file_name: fileName,
          format: exportFormat,
          size_bytes: fileBuffer.byteLength,
          email_sent: false,
          email_error: emailError.message,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Return file as base64 if not sending email
    return new Response(JSON.stringify({
      success: true,
      file_name: fileName,
      format: exportFormat,
      size_bytes: fileBuffer.byteLength,
      content_base64: fileBase64,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in drive-export:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
