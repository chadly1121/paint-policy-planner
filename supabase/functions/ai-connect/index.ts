import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Encrypt API key using AES-256-GCM
async function encryptApiKey(apiKey: string, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(encryptionKey.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    encoder.encode(apiKey)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { apiKey, provider = "openai" } = await req.json();

    if (!apiKey || typeof apiKey !== "string") {
      return new Response(JSON.stringify({ error: "API key is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate OpenAI key format
    if (provider === "openai" && !apiKey.startsWith("sk-")) {
      return new Response(JSON.stringify({ error: "Invalid OpenAI API key format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's org
    const { data: orgUser, error: orgError } = await supabase
      .from("org_users")
      .select("org_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (orgError || !orgUser) {
      return new Response(JSON.stringify({ error: "User not in an organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (orgUser.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can connect AI providers" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test the API key first
    console.log("Testing OpenAI API key...");
    const testResponse = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({}));
      console.error("OpenAI test failed:", testResponse.status, errorData);
      return new Response(JSON.stringify({ 
        error: "Invalid API key - connection test failed",
        details: errorData.error?.message || `Status: ${testResponse.status}`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("OpenAI API key valid, encrypting and storing...");

    // Encrypt the API key
    const encryptionKey = Deno.env.get("DRIVE_ENCRYPTION_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encryptedKey = await encryptApiKey(apiKey, encryptionKey);

    // Get hint (last 4 chars)
    const apiKeyHint = apiKey.slice(-4);

    // Upsert the AI settings
    const { data: aiSettings, error: upsertError } = await supabase
      .from("org_ai_settings")
      .upsert({
        org_id: orgUser.org_id,
        provider,
        api_key_encrypted: encryptedKey,
        api_key_hint: apiKeyHint,
        is_active: true,
        connected_by: user.id,
        connected_at: new Date().toISOString(),
        last_test_at: new Date().toISOString(),
        last_test_success: true,
        requests_this_month: 0,
        requests_month_start: new Date().toISOString().split("T")[0],
      }, {
        onConflict: "org_id,provider",
      })
      .select()
      .single();

    if (upsertError) {
      console.error("Error saving AI settings:", upsertError);
      throw upsertError;
    }

    console.log("AI provider connected successfully for org:", orgUser.org_id);

    return new Response(JSON.stringify({ 
      success: true, 
      provider,
      hint: apiKeyHint,
      connected_at: aiSettings.connected_at,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI connect error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Connection failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
