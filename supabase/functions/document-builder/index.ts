import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOCUMENT_TYPES = {
  sop: "Standard Operating Procedure (SOP)",
  policy: "Company Policy",
  safety: "Safety Protocol",
  training: "Training Requirement",
  disciplinary: "Disciplinary Procedure",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, documentType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const docTypeName = DOCUMENT_TYPES[documentType as keyof typeof DOCUMENT_TYPES] || "document";
    
    const systemPrompt = `You are a professional document writer specializing in creating ${docTypeName} documents for painting and contracting businesses.

Your role is to help users create well-structured, professional documents. When the user describes what they need:

1. Ask clarifying questions if the request is vague
2. Create clear, organized content with proper sections
3. Use industry-appropriate language and best practices
4. Include all necessary components for the document type

For SOPs, include: Purpose, Scope, Responsibilities, Procedure Steps, Safety Considerations, Quality Standards
For Policies, include: Purpose, Scope, Policy Statement, Procedures, Responsibilities, Consequences
For Safety Protocols, include: Hazard Identification, Required PPE, Safe Work Procedures, Emergency Procedures
For Training Requirements, include: Learning Objectives, Prerequisites, Training Content, Assessment Criteria
For Disciplinary Procedures, include: Purpose, Scope, Progressive Discipline Steps, Documentation Requirements

Format your responses in clean Markdown. When providing the final document, wrap it in a code block with \`\`\`markdown tags so users can easily copy it.

Be helpful, professional, and thorough. Ask questions to ensure the document meets the user's specific needs.`;

    console.log(`Document builder request - Type: ${documentType}, Messages: ${messages.length}`);

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Document builder error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
