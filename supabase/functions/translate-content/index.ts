import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  tl: "Tagalog (Filipino)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, targetLanguage, sourceLanguage, contentType } = await req.json();

    if (!content || !targetLanguage) {
      return new Response(JSON.stringify({ error: "Missing content or targetLanguage" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const isTitle = contentType === "title";

    // If target language is English or same as source, return original
    if (targetLanguage === "en" || targetLanguage === sourceLanguage) {
      return new Response(JSON.stringify({ translatedContent: content, fromCache: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const targetLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
    const sourceLangName = LANGUAGE_NAMES[sourceLanguage || "en"] || "English";

    console.log(`Translating content from ${sourceLangName} to ${targetLangName}`);

    const systemPrompt = isTitle 
      ? `You are a professional translator. Translate the following document title from ${sourceLangName} to ${targetLangName}. Return ONLY the translated title, nothing else. Keep it concise and professional.`
      : `You are a professional translator specializing in workplace documentation.
Translate the following content from ${sourceLangName} to ${targetLangName}.
Maintain the original formatting, structure, and any markdown/headers.
Keep technical terms accurate and use appropriate workplace terminology.
Do not add any commentary or notes - just provide the translation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: content },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact admin." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`Translation failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const translatedContent = aiResponse.choices?.[0]?.message?.content;

    if (!translatedContent) {
      throw new Error("No translation received from AI");
    }

    console.log(`Translation complete: ${content.length} chars -> ${translatedContent.length} chars`);

    return new Response(JSON.stringify({ 
      translatedContent,
      fromCache: false,
      targetLanguage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Translation failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
