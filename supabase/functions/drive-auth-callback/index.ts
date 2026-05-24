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
  
  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle OAuth callback (GET request from Google)
  if (req.method === 'GET') {
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    const htmlHeaders = { 'Content-Type': 'text/html; charset=utf-8' };

    if (error) {
      console.error('OAuth error:', error);
      return new Response(
`<!DOCTYPE html>
<html>
<body>
<h1>Authorization Failed</h1>
<p>Error: ${error}</p>
<script>window.close();</script>
</body>
</html>`,
        { status: 400, headers: htmlHeaders }
      );
    }

    if (!code || !stateParam) {
      return new Response(
`<!DOCTYPE html>
<html>
<body>
<h1>Invalid Request</h1>
<p>Missing authorization code or state</p>
<script>window.close();</script>
</body>
</html>`,
        { status: 400, headers: htmlHeaders }
      );
    }

    try {
      // Decode state
      const state = JSON.parse(atob(stateParam));
      const { user_id, org_id, code_verifier } = state;

      // Validate timestamp (15 min expiry)
      if (Date.now() - state.timestamp > 15 * 60 * 1000) {
        throw new Error('State expired');
      }

      // Exchange code for tokens
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

      // Verify required scopes - REJECT if missing
      const grantedScopes = tokens.scope.split(' ');
      const requiredScopes = ['drive.file', 'documents'];
      const missingScopes = requiredScopes.filter(s => 
        !grantedScopes.some((gs: string) => gs.includes(s))
      );
      
      if (missingScopes.length > 0) {
        console.error('Missing required scopes:', missingScopes);
        const scopeNames = missingScopes.map(s => {
          if (s === 'drive.file') return 'Google Drive file access';
          if (s === 'documents') return 'Google Docs access';
          return s;
        }).join(', ');
        
        return new Response(`
          <html>
            <body>
              <h1>Insufficient Permissions</h1>
              <p>The following permissions were not granted: <strong>${scopeNames}</strong></p>
              <p>Please try connecting again and make sure to grant all requested permissions.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'DRIVE_AUTH_ERROR', 
                    error: 'Missing required permissions: ${scopeNames}. Please reconnect and grant all permissions.' 
                  }, '*');
                }
                setTimeout(() => window.close(), 5000);
              </script>
            </body>
          </html>
        `, { 
          status: 400, 
          headers: { 'Content-Type': 'text/html' } 
        });
      }

      // Get Google user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      
      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info');
      }
      
      const googleUser = await userInfoResponse.json();
      console.log('Google user:', googleUser.email, 'subject:', googleUser.id);

      // Encrypt tokens
      const accessTokenEncrypted = await encryptToken(tokens.access_token);
      const refreshTokenEncrypted = await encryptToken(tokens.refresh_token);

      // Use service role to store tokens
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Check if this is the first connection for the org (make it primary)
      const { data: existingTokens } = await supabase
        .from('user_drive_tokens')
        .select('id')
        .eq('org_id', org_id)
        .eq('is_active', true)
        .eq('is_primary', true);

      const isPrimary = !existingTokens || existingTokens.length === 0;

      // Check for existing token from same Google account
      const { data: existingUserToken } = await supabase
        .from('user_drive_tokens')
        .select('id, is_primary')
        .eq('user_id', user_id)
        .eq('google_subject', googleUser.id)
        .single();

      if (existingUserToken) {
        // Update existing token
        // If no primary token exists for the org, make this one primary
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
        // Insert new token
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

      // Return success HTML that closes the popup
      return new Response(`
        <html>
          <body>
            <h1>Google Drive Connected!</h1>
            <p>You can close this window now.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'DRIVE_AUTH_SUCCESS' }, '*');
              }
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `, { 
        status: 200, 
        headers: { 'Content-Type': 'text/html' } 
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Callback error:', error);
      return new Response(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>Error: ${errorMessage}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'DRIVE_AUTH_ERROR', error: '${errorMessage}' }, '*');
              }
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `, { 
        status: 400, 
        headers: { 'Content-Type': 'text/html' } 
      });
    }
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return new Response('Method not allowed', { status: 405 });
});
