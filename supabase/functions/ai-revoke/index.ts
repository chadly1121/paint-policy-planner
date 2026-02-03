import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      return new Response(JSON.stringify({ error: "Only admins can revoke AI connection" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete AI settings for this org
    const { error: deleteError } = await supabase
      .from("org_ai_settings")
      .delete()
      .eq("org_id", orgUser.org_id)
      .eq("provider", "openai");

    if (deleteError) {
      console.error("Error deleting AI settings:", deleteError);
      throw deleteError;
    }

    console.log("AI provider disconnected for org:", orgUser.org_id);

    return new Response(JSON.stringify({ 
      success: true,
      message: "AI provider disconnected",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI revoke error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Revoke failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
