import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Decrypt API key using AES-256-GCM
async function decryptApiKey(encryptedData: string, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(encryptionKey.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    encrypted
  );

  return decoder.decode(decrypted);
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
      return new Response(JSON.stringify({ error: "Only admins can test AI connection" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get AI settings
    const { data: aiSettings, error: aiError } = await supabase
      .from("org_ai_settings")
      .select("*")
      .eq("org_id", orgUser.org_id)
      .eq("provider", "openai")
      .single();

    if (aiError || !aiSettings) {
      return new Response(JSON.stringify({ error: "No AI provider connected" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decrypt API key
    const encryptionKey = Deno.env.get("DRIVE_ENCRYPTION_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = await decryptApiKey(aiSettings.api_key_encrypted, encryptionKey);

    // Test the API key
    console.log("Testing OpenAI connection...");
    const testResponse = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const testSuccess = testResponse.ok;
    let errorMessage = null;

    if (!testSuccess) {
      const errorData = await testResponse.json().catch(() => ({}));
      errorMessage = errorData.error?.message || `Status: ${testResponse.status}`;
      console.error("OpenAI test failed:", errorMessage);
    }

    // Update test status
    await supabase
      .from("org_ai_settings")
      .update({
        last_test_at: new Date().toISOString(),
        last_test_success: testSuccess,
      })
      .eq("id", aiSettings.id);

    if (!testSuccess) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("OpenAI connection test successful");

    return new Response(JSON.stringify({ 
      success: true,
      message: "Connection successful",
      tested_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI test error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Test failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
