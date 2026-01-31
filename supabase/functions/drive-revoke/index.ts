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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { token_id, reason } = body;

    if (!token_id) {
      return new Response(JSON.stringify({ error: 'token_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the token (user can only revoke their own tokens)
    const { data: tokenRecord, error: fetchError } = await supabase
      .from('user_drive_tokens')
      .select('*')
      .eq('id', token_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !tokenRecord) {
      return new Response(JSON.stringify({ error: 'Token not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Revoke at Google
    try {
      const accessToken = await decryptToken(tokenRecord.access_token_encrypted);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      console.log('Token revoked at Google');
    } catch (revokeError) {
      console.warn('Failed to revoke at Google (continuing):', revokeError);
    }

    // Soft-delete the token
    const { error: updateError } = await supabase
      .from('user_drive_tokens')
      .update({
        is_active: false,
        is_primary: false,
        revoked_at: new Date().toISOString(),
        revoke_reason: reason || 'User requested disconnect',
      })
      .eq('id', token_id);

    if (updateError) {
      throw new Error('Failed to update token record');
    }

    // If this was primary, promote another token if available
    if (tokenRecord.is_primary) {
      const serviceSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: otherTokens } = await serviceSupabase
        .from('user_drive_tokens')
        .select('id')
        .eq('org_id', tokenRecord.org_id)
        .eq('is_active', true)
        .limit(1);

      if (otherTokens && otherTokens.length > 0) {
        await serviceSupabase
          .from('user_drive_tokens')
          .update({ is_primary: true })
          .eq('id', otherTokens[0].id);
        console.log('Promoted new primary token:', otherTokens[0].id);
      }
    }

    console.log('Token revoked for user:', user.id, 'token:', token_id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in drive-revoke:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
