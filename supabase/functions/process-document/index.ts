import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProcessedContent {
  title: string;
  content: string;
  type: string;
  summary: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { documentText, contentType, fileName } = await req.json();

    if (!documentText || !contentType) {
      return new Response(
        JSON.stringify({ error: "Document text and content type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentTypeDescriptions: Record<string, string> = {
      sop: "Standard Operating Procedure (SOP) - step-by-step instructions for operational tasks",
      policy: "Company Policy - rules, guidelines, and expectations for employee behavior",
      training: "Training Material - educational content for employee skill development",
      safety: "Safety Protocol - procedures to ensure workplace safety and compliance",
      disciplinary: "Disciplinary Procedure - guidelines for handling employee misconduct",
    };

    const systemPrompt = `You are an expert document processor for an employee manual system. Your task is to take raw document content and transform it into a well-structured ${contentTypeDescriptions[contentType] || contentType}.

IMPORTANT FORMATTING RULES:
1. Use proper markdown formatting with clear headings (## for main sections, ### for subsections)
2. Use bullet points for lists of items or steps
3. Use numbered lists for sequential procedures
4. Keep paragraphs concise and professional
5. Maintain a consistent, formal tone appropriate for workplace documentation
6. Organize content logically with clear section breaks
7. Include an overview/purpose section at the beginning if not present
8. Add any necessary safety warnings or compliance notes where appropriate

CONTENT STRUCTURE FOR ${contentType.toUpperCase()}:
${contentType === "sop" ? `
- Purpose/Overview
- Scope (who this applies to)
- Materials/Equipment Needed (if applicable)
- Step-by-step Procedure (numbered)
- Safety Considerations
- Quality Standards
- Documentation Requirements` : ""}
${contentType === "policy" ? `
- Policy Statement
- Purpose
- Scope
- Definitions (if needed)
- Policy Details
- Responsibilities
- Consequences of Non-Compliance
- Related Policies` : ""}
${contentType === "training" ? `
- Learning Objectives
- Introduction
- Key Concepts
- Detailed Content
- Best Practices
- Summary/Key Takeaways
- Assessment Questions (if applicable)` : ""}
${contentType === "safety" ? `
- Purpose
- Hazard Identification
- Required PPE
- Safety Procedures
- Emergency Procedures
- Reporting Requirements
- Training Requirements` : ""}
${contentType === "disciplinary" ? `
- Purpose
- Scope
- Types of Misconduct
- Progressive Discipline Steps
- Documentation Requirements
- Appeal Process
- Employee Rights` : ""}

Return a JSON object with:
- "title": A clear, professional title for this document (max 100 characters)
- "content": The fully formatted markdown content
- "summary": A brief 1-2 sentence summary of what this document covers`;

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
          { 
            role: "user", 
            content: `Please process this document (filename: ${fileName || "unknown"}) into a properly formatted ${contentType}:\n\n${documentText.substring(0, 50000)}` 
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "format_document",
              description: "Return the formatted document content",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Professional title for the document",
                  },
                  content: {
                    type: "string",
                    description: "Full markdown-formatted content",
                  },
                  summary: {
                    type: "string",
                    description: "Brief 1-2 sentence summary",
                  },
                },
                required: ["title", "content", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "format_document" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits depleted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "format_document") {
      console.error("No valid tool call in response:", data);
      return new Response(
        JSON.stringify({ error: "Failed to process document - invalid AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processedContent: ProcessedContent;
    try {
      processedContent = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("Failed to parse tool response:", parseError);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Document processed successfully:", processedContent.title);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          title: processedContent.title,
          content: processedContent.content,
          summary: processedContent.summary,
          type: contentType,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing document:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
