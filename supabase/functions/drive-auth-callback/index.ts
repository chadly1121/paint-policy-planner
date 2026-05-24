import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const DRIVE_ENCRYPTION_KEY = Deno.env.get('DRIVE_ENCRYPTION_KEY')!;
const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/drive-auth-callback`;
const FRONTEND_URL_FALLBACK = Deno.env.get('FRONTEND_URL') || 'https://soped.ai';

// AES-256-GCM encryption for tokens
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

function frontendRedirect(frontendOrigin: string, params: Record<string, string>): Response {
  const base = (frontendOrigin && frontendOrigin.startsWith('http')) ? frontendOrigin : FRONTEND_URL_FALLBACK;
  const url = new URL('/drive-auth-complete', base);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Response(null, {
    status: 302,
    headers: { 'Location': url.toString() },
  });
}

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Best-effort: try to decode origin from state for redirects even on error
  let frontendOrigin = '';
  let state: any = null;
  if (stateParam) {
    try {
      state = JSON.parse(atob(stateParam));
      frontendOrigin = state.frontend_origin || '';
    } catch {
      // ignore
    }
  }

  if (error) {
    console.error('OAuth error:', error);
    return frontendRedirect(frontendOrigin, { status: 'error', message: error });
  }

  if (!code || !stateParam || !state) {
    return frontendRedirect(frontendOrigin, { status: 'error', message: 'Missing authorization code or state' });
  }

  try {
    const { user_id, org_id, code_verifier } = state;

    if (Date.now() - state.timestamp > 15 * 60 * 1000) {
      throw new Error('State expired');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        code_verifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error('Failed to exchange authorization code');
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens received, scopes:', tokens.scope);

    const grantedScopes = tokens.scope.split(' ');
    const requiredScopes = ['drive.file', 'documents'];
    const missingScopes = requiredScopes.filter(s =>
      !grantedScopes.some((gs: string) => gs.includes(s))
    );

    if (missingScopes.length > 0) {
      const scopeNames = missingScopes.map(s => {
        if (s === 'drive.file') return 'Google Drive file access';
        if (s === 'documents') return 'Google Docs access';
        return s;
      }).join(', ');
      console.error('Missing required scopes:', missingScopes);
      return frontendRedirect(frontendOrigin, {
        status: 'error',
        message: `Missing required permissions: ${scopeNames}. Please reconnect and grant all permissions.`,
      });
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const googleUser = await userInfoResponse.json();
    console.log('Google user:', googleUser.email, 'subject:', googleUser.id);

    const accessTokenEncrypted = await encryptToken(tokens.access_token);
    const refreshTokenEncrypted = await encryptToken(tokens.refresh_token);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: existingTokens } = await supabase
      .from('user_drive_tokens')
      .select('id')
      .eq('org_id', org_id)
      .eq('is_active', true)
      .eq('is_primary', true);

    const isPrimary = !existingTokens || existingTokens.length === 0;

    const { data: existingUserToken } = await supabase
      .from('user_drive_tokens')
      .select('id, is_primary')
      .eq('user_id', user_id)
      .eq('google_subject', googleUser.id)
      .maybeSingle();

    if (existingUserToken) {
      const shouldBePrimary = isPrimary || existingUserToken.is_primary;
      const { error: updateError } = await supabase
        .from('user_drive_tokens')
        .update({
          access_token_encrypted: accessTokenEncrypted,
          refresh_token_encrypted: refreshTokenEncrypted,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          is_active: true,
          is_primary: shouldBePrimary,
          last_refresh_at: new Date().toISOString(),
          revoked_at: null,
          revoke_reason: null,
          last_refresh_error: null,
        })
        .eq('id', existingUserToken.id);

      if (updateError) {
        console.error('Failed to update token:', updateError);
        throw new Error('Failed to store tokens');
      }
      console.log('Token updated for user:', user_id, 'primary:', shouldBePrimary);
    } else {
      const { error: insertError } = await supabase
        .from('user_drive_tokens')
        .insert({
          user_id,
          org_id,
          google_subject: googleUser.id,
          google_email: googleUser.email,
          access_token_encrypted: accessTokenEncrypted,
          refresh_token_encrypted: refreshTokenEncrypted,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          is_primary: isPrimary,
          is_active: true,
          last_refresh_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Failed to insert token:', insertError);
        throw new Error('Failed to store tokens');
      }
      console.log('Token created for user:', user_id, 'primary:', isPrimary);
    }

    console.log('Token stored successfully for user:', user_id, 'primary:', isPrimary);
    return frontendRedirect(frontendOrigin, { status: 'success' });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Callback error:', err);
    return frontendRedirect(frontendOrigin, { status: 'error', message: errorMessage });
  }
});
