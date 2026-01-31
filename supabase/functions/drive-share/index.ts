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
    const { file_id, permission, send_email, email_to, email_subject, email_message } = body;

    if (!file_id) {
      return new Response(JSON.stringify({ error: 'file_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate permission type
    const validPermissions = ['view', 'edit', 'comment'];
    const sharePermission = permission || 'view';
    if (!validPermissions.includes(sharePermission)) {
      return new Response(JSON.stringify({ error: 'Invalid permission. Use view, edit, or comment' }), {
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
      `https://www.googleapis.com/drive/v3/files/${file_id}?fields=name,mimeType,webViewLink`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!metadataResponse.ok) {
      throw new Error('Failed to get file metadata');
    }

    const fileMetadata = await metadataResponse.json();
    console.log('Sharing file:', fileMetadata.name, 'with permission:', sharePermission);

    // Map permission to Drive API role
    const roleMap: Record<string, string> = {
      'view': 'reader',
      'comment': 'commenter',
      'edit': 'writer',
    };

    // Create "anyone with link" permission
    const permissionResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file_id}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: roleMap[sharePermission],
          type: 'anyone',
        }),
      }
    );

    if (!permissionResponse.ok) {
      const error = await permissionResponse.text();
      throw new Error(`Failed to set permissions: ${error}`);
    }

    console.log('Permission set successfully');

    // Get updated file with webViewLink
    const updatedMetadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file_id}?fields=webViewLink`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const updatedMetadata = await updatedMetadataResponse.json();
    const shareLink = updatedMetadata.webViewLink;

    console.log('Share link generated:', shareLink);

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
          share_link: shareLink,
          file_name: fileMetadata.name,
          permission: sharePermission,
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

        const senderName = profile?.full_name || 'SOPed User';
        const permissionText = sharePermission === 'edit' ? 'edit' : sharePermission === 'comment' ? 'comment on' : 'view';
        const customMessage = email_message ? `<p style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">${email_message}</p>` : '';

        const emailResult = await resend.emails.send({
          from: 'SOPed <notifications@soped.ai>',
          to: Array.isArray(email_to) ? email_to : [email_to],
          subject: email_subject || `${senderName} shared a document with you: ${fileMetadata.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Document Shared with You</h2>
              <p><strong>${senderName}</strong> has shared a Google Doc with you.</p>
              ${customMessage}
              <div style="margin: 25px 0; padding: 20px; background: #f0f7ff; border-radius: 8px; border-left: 4px solid #2563eb;">
                <p style="margin: 0 0 10px 0;"><strong>Document:</strong> ${fileMetadata.name}</p>
                <p style="margin: 0 0 15px 0;"><strong>Permission:</strong> You can ${permissionText} this document</p>
                <a href="${shareLink}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Open Document
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                This link will allow you to ${permissionText} the document directly in Google Docs.
              </p>
            </div>
          `,
        });

        console.log('Email sent:', emailResult);

        return new Response(JSON.stringify({
          success: true,
          file_name: fileMetadata.name,
          permission: sharePermission,
          share_link: shareLink,
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
          file_name: fileMetadata.name,
          permission: sharePermission,
          share_link: shareLink,
          email_sent: false,
          email_error: emailError.message,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Return share link if not sending email
    return new Response(JSON.stringify({
      success: true,
      file_name: fileMetadata.name,
      permission: sharePermission,
      share_link: shareLink,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in drive-share:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
