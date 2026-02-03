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

// Fetch document content from Drive
async function fetchDriveContent(fileId: string, accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

// Refresh Drive token
async function refreshDriveToken(refreshTokenEncrypted: string, encryptionKey: string): Promise<string | null> {
  try {
    const refreshToken = await decryptApiKey(refreshTokenEncrypted, encryptionKey);
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  } catch {
    return null;
  }
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

    const { messages, targetLanguage } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's org
    const { data: orgUser, error: orgError } = await supabase
      .from("org_users")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (orgError || !orgUser) {
      return new Response(JSON.stringify({ error: "User not in an organization" }), {
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
      .eq("is_active", true)
      .single();

    if (aiError || !aiSettings) {
      return new Response(JSON.stringify({ 
        error: "AI_NOT_CONNECTED",
        message: "Connect your AI provider to enable SOP Assistant." 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decrypt API key
    const encryptionKey = Deno.env.get("DRIVE_ENCRYPTION_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = await decryptApiKey(aiSettings.api_key_encrypted, encryptionKey);

    // Get Drive token for fetching documents
    const { data: driveToken } = await supabase
      .from("user_drive_tokens")
      .select("*")
      .eq("org_id", orgUser.org_id)
      .eq("is_primary", true)
      .eq("is_active", true)
      .single();

    // Fetch org's SOP documents for context
    let sopContext = "";
    const citedDocs: { title: string; fileId: string; webViewLink: string }[] = [];

    if (driveToken) {
      // Get list of SOPs
      const { data: sops } = await supabase
        .from("sops")
        .select("id, title, drive_file_id")
        .eq("org_id", orgUser.org_id)
        .eq("status", "active")
        .not("drive_file_id", "is", null)
        .limit(20);

      if (sops && sops.length > 0) {
        const accessToken = await refreshDriveToken(driveToken.refresh_token_encrypted, encryptionKey);
        
        if (accessToken) {
          // Fetch content from each SOP (limit to prevent token overflow)
          for (const sop of sops.slice(0, 10)) {
            const content = await fetchDriveContent(sop.drive_file_id!, accessToken);
            if (content) {
              sopContext += `\n\n--- Document: ${sop.title} ---\n${content.slice(0, 3000)}`;
              citedDocs.push({
                title: sop.title,
                fileId: sop.drive_file_id!,
                webViewLink: `https://docs.google.com/document/d/${sop.drive_file_id}/edit`,
              });
            }
          }
        }
      }
    }

    // Build system prompt
    const languageInstruction = targetLanguage && targetLanguage !== "en" 
      ? `\nIMPORTANT: Respond in ${targetLanguage === "es" ? "Spanish" : targetLanguage === "fr" ? "French" : targetLanguage === "tl" ? "Tagalog" : "English"}.` 
      : "";

    const systemPrompt = `You are an SOP Assistant for this organization. Your role is to answer questions about the organization's standard operating procedures, policies, and safety protocols.

CRITICAL RULES:
1. ONLY answer based on the documents provided below. Do not make up information.
2. If the answer is not in the documents, say "I couldn't find information about that in your organization's documents."
3. When you reference information, cite the document title.
4. Be concise but thorough.
5. For safety-related questions, always emphasize following proper procedures.
${languageInstruction}

ORGANIZATION DOCUMENTS:
${sopContext || "No documents available. The organization needs to add SOPs to Google Drive."}`;

    console.log(`SOP Assistant request for org ${orgUser.org_id}, ${citedDocs.length} docs loaded`);

    // Call OpenAI with the org's key
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", response.status, errorData);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMIT"
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 401) {
        // Mark connection as failed
        await supabase
          .from("org_ai_settings")
          .update({ last_test_success: false })
          .eq("id", aiSettings.id);
          
        return new Response(JSON.stringify({ 
          error: "AI API key is invalid. Please reconnect in Admin settings.",
          code: "INVALID_KEY"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(errorData.error?.message || "OpenAI API error");
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices?.[0]?.message?.content;

    // Update usage stats
    const now = new Date();
    const monthStart = new Date(aiSettings.requests_month_start);
    const isNewMonth = now.getMonth() !== monthStart.getMonth() || now.getFullYear() !== monthStart.getFullYear();

    await supabase
      .from("org_ai_settings")
      .update({
        last_used_at: now.toISOString(),
        requests_this_month: isNewMonth ? 1 : (aiSettings.requests_this_month || 0) + 1,
        requests_month_start: isNewMonth ? now.toISOString().split("T")[0] : aiSettings.requests_month_start,
      })
      .eq("id", aiSettings.id);

    console.log("SOP Assistant response generated successfully");

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      citedDocs: citedDocs.slice(0, 5), // Return up to 5 cited docs
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("SOP Assistant error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Assistant error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
