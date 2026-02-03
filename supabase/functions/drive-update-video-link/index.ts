import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Decrypt token using AES-256-GCM
async function decryptToken(encrypted: string): Promise<string> {
  const key = Deno.env.get("DRIVE_ENCRYPTION_KEY");
  if (!key) throw new Error("DRIVE_ENCRYPTION_KEY not configured");

  const [ivHex, ciphertextHex, tagHex] = encrypted.split(":");
  const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const ciphertext = new Uint8Array(
    ciphertextHex.match(/.{2}/g)!.map((b) => parseInt(b, 16))
  );
  const tag = new Uint8Array(
    tagHex.match(/.{2}/g)!.map((b) => parseInt(b, 16))
  );

  const keyBytes = new Uint8Array(
    key.match(/.{2}/g)!.map((b) => parseInt(b, 16))
  );
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    combined
  );

  return new TextDecoder().decode(decrypted);
}

// Refresh access token if needed
async function getValidAccessToken(
  tokenRecord: any
): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(tokenRecord.token_expires_at);

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const refreshToken = await decryptToken(tokenRecord.refresh_token_encrypted);
    
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh access token");
    }

    const data = await response.json();
    return data.access_token;
  }

  return decryptToken(tokenRecord.access_token_encrypted);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { file_id, video_url } = await req.json();

    if (!file_id) {
      return new Response(JSON.stringify({ error: "file_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's org
    const { data: orgUser } = await supabase
      .from("org_users")
      .select("org_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!orgUser || orgUser.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get primary Drive token for org
    const { data: tokenRecord } = await supabase
      .from("user_drive_tokens")
      .select("*")
      .eq("org_id", orgUser.org_id)
      .eq("is_primary", true)
      .eq("is_active", true)
      .single();

    if (!tokenRecord) {
      return new Response(
        JSON.stringify({ error: "No Drive connection found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accessToken = await getValidAccessToken(tokenRecord);

    // First, get the current document content to find if video link section exists
    const docResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${file_id}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!docResponse.ok) {
      const errorText = await docResponse.text();
      console.error("Failed to get document:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to access document" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const doc = await docResponse.json();
    const content = doc.body?.content || [];

    // Search for existing video link section
    let videoSectionStart = -1;
    let videoSectionEnd = -1;
    const VIDEO_MARKER = "📹 Training Video:";

    for (const element of content) {
      if (element.paragraph?.elements) {
        for (const elem of element.paragraph.elements) {
          if (elem.textRun?.content?.includes(VIDEO_MARKER)) {
            videoSectionStart = element.startIndex;
            // Find the end of this paragraph
            videoSectionEnd = element.endIndex;
            break;
          }
        }
      }
      if (videoSectionStart !== -1) break;
    }

    const requests: any[] = [];

    // If video section exists, delete it first
    if (videoSectionStart !== -1 && videoSectionEnd !== -1) {
      requests.push({
        deleteContentRange: {
          range: {
            startIndex: videoSectionStart,
            endIndex: videoSectionEnd,
          },
        },
      });
    }

    // If we have a new video URL, insert it at the beginning (after any title)
    if (video_url) {
      const insertIndex = 1; // Insert at the very beginning after the doc start
      const videoText = `${VIDEO_MARKER} ${video_url}\n\n`;

      requests.push({
        insertText: {
          location: { index: insertIndex },
          text: videoText,
        },
      });

      // Style the video link section
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: insertIndex,
            endIndex: insertIndex + VIDEO_MARKER.length,
          },
          textStyle: {
            bold: true,
            foregroundColor: {
              color: { rgbColor: { red: 0.2, green: 0.4, blue: 0.8 } },
            },
          },
          fields: "bold,foregroundColor",
        },
      });

      // Make the URL a clickable link
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: insertIndex + VIDEO_MARKER.length + 1,
            endIndex: insertIndex + videoText.length - 2, // Exclude newlines
          },
          textStyle: {
            link: { url: video_url },
            foregroundColor: {
              color: { rgbColor: { red: 0.1, green: 0.4, blue: 0.8 } },
            },
            underline: true,
          },
          fields: "link,foregroundColor,underline",
        },
      });
    }

    // Apply the updates if we have any
    if (requests.length > 0) {
      const updateResponse = await fetch(
        `https://docs.googleapis.com/v1/documents/${file_id}:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ requests }),
        }
      );

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error("Failed to update document:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to update document" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Update last_used_at
    await supabase
      .from("user_drive_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", tokenRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: video_url
          ? "Video link added to document"
          : "Video link removed from document",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error updating video link:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
