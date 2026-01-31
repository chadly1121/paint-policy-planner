import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
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

// Encryption helper
async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(DRIVE_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    encoder.encode(token)
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

// Refresh tokens for a given token record
async function refreshTokens(tokenRecord: any, supabase: any): Promise<{ access_token: string } | null> {
  try {
    const refreshToken = await decryptToken(tokenRecord.refresh_token_encrypted);
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', errorText);
      
      // Update token with error
      await supabase
        .from('user_drive_tokens')
        .update({
          last_refresh_error: errorText,
          last_refresh_at: new Date().toISOString(),
        })
        .eq('id', tokenRecord.id);
      
      return null;
    }

    const tokens = await response.json();
    const accessTokenEncrypted = await encryptToken(tokens.access_token);
    
    // Update token in database
    await supabase
      .from('user_drive_tokens')
      .update({
        access_token_encrypted: accessTokenEncrypted,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        last_refresh_at: new Date().toISOString(),
        last_refresh_error: null,
      })
      .eq('id', tokenRecord.id);

    console.log('Token refreshed for user:', tokenRecord.user_id);
    
    return { access_token: tokens.access_token };

  } catch (error: unknown) {
    console.error('Refresh error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await supabase
      .from('user_drive_tokens')
      .update({
        last_refresh_error: errorMessage,
        last_refresh_at: new Date().toISOString(),
      })
      .eq('id', tokenRecord.id);
    
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { token_id, org_id } = body;

    if (!token_id && !org_id) {
      return new Response(JSON.stringify({ error: 'token_id or org_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let query = supabase
      .from('user_drive_tokens')
      .select('*')
      .eq('is_active', true);

    if (token_id) {
      query = query.eq('id', token_id);
    } else if (org_id) {
      query = query.eq('org_id', org_id).eq('is_primary', true);
    }

    const { data: tokenRecords, error: fetchError } = await query;

    if (fetchError || !tokenRecords || tokenRecords.length === 0) {
      return new Response(JSON.stringify({ error: 'No active tokens found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];
    for (const token of tokenRecords) {
      const result = await refreshTokens(token, supabase);
      results.push({
        token_id: token.id,
        user_id: token.user_id,
        success: result !== null,
      });
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in drive-token-refresh:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
