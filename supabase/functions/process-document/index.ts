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

// Mirror of public.parse_document_sections (plpgsql). Keep in sync with migration.
const HEADING_MAP: Array<{ test: (h: string) => boolean; key: string; kind: "string" | "bullets" | "numbered" | "responsibilities" }> = [
  { test: (h) => h === "purpose" || h === "purpose/overview" || h.startsWith("purpose "), key: "purpose", kind: "string" },
  { test: (h) => h === "scope", key: "scope", kind: "string" },
  { test: (h) => h === "non-negotiables" || h === "non negotiables", key: "non_negotiables", kind: "bullets" },
  { test: (h) => h === "policy statement", key: "policy_statement", kind: "string" },
  { test: (h) => h === "procedure" || h === "procedures" || h === "step-by-step procedure" || h === "procedure steps", key: "procedure_steps", kind: "numbered" },
  { test: (h) => h.startsWith("required tools") || h === "tools required" || h.startsWith("materials/equipment") || h.startsWith("materials and equipment"), key: "tools_required", kind: "bullets" },
  { test: (h) => h === "quality check" || h === "definition of done" || h === "quality standards", key: "quality_check", kind: "string" },
  { test: (h) => h === "common mistakes to avoid" || h === "common mistakes", key: "common_mistakes", kind: "bullets" },
  { test: (h) => h === "responsibilities", key: "responsibilities", kind: "responsibilities" },
  { test: (h) => h === "consequences of non-compliance" || h === "consequences", key: "consequences", kind: "string" },
  { test: (h) => h === "acknowledgement" || h === "acknowledgment", key: "acknowledgement", kind: "string" },
];

function parseDocumentSections(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {
    purpose: null, scope: null, non_negotiables: null, policy_statement: null,
    procedure_steps: null, tools_required: null, quality_check: null,
    common_mistakes: null, responsibilities: null, consequences: null, acknowledgement: null,
  };
  if (!content || !content.trim()) return result;

  const lines = content.split(/\r?\n/);
  lines.push("## __END__");

  let currentKey: string | null = null;
  let currentKind: "string" | "bullets" | "numbered" | "responsibilities" | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentKey || !currentKind) return;
    const text = buffer.join("\n").trim();
    if (!text) return;
    if (currentKind === "string") {
      result[currentKey] = text;
    } else if (currentKind === "bullets" || currentKind === "numbered") {
      const items = text.split(/\r?\n/)
        .map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim())
        .filter((l) => l && !l.startsWith("#"));
      if (items.length) result[currentKey] = items;
    } else if (currentKind === "responsibilities") {
      const arr: Array<{ role: string; duties: string }> = [];
      for (const raw of text.split(/\r?\n/)) {
        const l = raw.replace(/^\s*[-*•]\s*/, "").trim();
        if (!l || l.startsWith("#")) continue;
        const m = l.match(/^\*{0,2}([^:*]+)\*{0,2}\s*[:\-–]\s*(.+)$/);
        if (m) arr.push({ role: m[1].trim(), duties: m[2].trim() });
        else arr.push({ role: l, duties: "" });
      }
      if (arr.length) result[currentKey] = arr;
    }
  };

  for (const line of lines) {
    const h2 = line.match(/^\s*##\s+(.+?)\s*$/);
    if (h2) {
      flush();
      buffer = [];
      const heading = h2[1].toLowerCase().replace(/[/(].*$/, "").trim();
      const mapping = HEADING_MAP.find((m) => m.test(heading));
      currentKey = mapping?.key ?? null;
      currentKind = mapping?.kind ?? null;
    } else {
      buffer.push(line);
    }
  }
  flush();
  return result;
}

async function detectContentType(documentText: string, fileName?: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const detectionPrompt = `Analyze this document and determine which category it best fits into. Choose EXACTLY ONE of these categories:

- sop: Standard Operating Procedure - step-by-step instructions for operational tasks, workflows, processes
- policy: Company Policy - rules, guidelines, expectations for employee behavior, HR policies
- training: Training Material - educational content, skill development, onboarding materials
- safety: Safety Protocol - workplace safety procedures, hazard prevention, PPE requirements
- disciplinary: Disciplinary Procedure - misconduct handling, progressive discipline, termination policies

Consider:
- SOPs focus on "how to do" specific tasks
- Policies focus on "what is allowed/required" rules
- Training focuses on teaching/learning content
- Safety focuses on preventing injuries and hazards
- Disciplinary focuses on consequences and corrective actions

Return ONLY the category keyword (sop, policy, training, safety, or disciplinary).`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: detectionPrompt },
        { 
          role: "user", 
          content: `Filename: ${fileName || "unknown"}\n\nDocument content (first 5000 chars):\n${documentText.substring(0, 5000)}` 
        },
      ],
      max_tokens: 50,
    }),
  });

  if (!response.ok) {
    console.error("Content detection failed:", response.status);
    return "sop"; // Default fallback
  }

  const data = await response.json();
  const detected = data.choices?.[0]?.message?.content?.trim().toLowerCase() || "sop";
  
  // Validate the detected type
  const validTypes = ["sop", "policy", "training", "safety", "disciplinary"];
  if (validTypes.includes(detected)) {
    console.log(`Auto-detected content type: ${detected}`);
    return detected;
  }
  
  // Try to extract valid type from response
  for (const type of validTypes) {
    if (detected.includes(type)) {
      console.log(`Extracted content type: ${type}`);
      return type;
    }
  }
  
  console.log("Could not detect type, defaulting to sop");
  return "sop";
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

    const { documentText, contentType, fileName, autoDetect } = await req.json();

    if (!documentText) {
      return new Response(
        JSON.stringify({ error: "Document text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If autoDetect is true and no contentType provided, detect it first
    let detectedType = contentType;
    if (autoDetect && !contentType) {
      detectedType = await detectContentType(documentText, fileName);
    }

    if (!detectedType) {
      return new Response(
        JSON.stringify({ error: "Content type is required or enable auto-detection" }),
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

    const systemPrompt = `You are an expert document processor for an employee manual system. Your task is to take raw document content and transform it into a well-structured ${contentTypeDescriptions[detectedType] || detectedType}.

CRITICAL FORMATTING RULES - Follow these exactly:
1. Use ## for main section headers (e.g., "## Purpose/Overview")
2. Use ### for subsection headers (e.g., "### Required Materials")
3. Use "- " for bullet points (dash followed by space)
4. Use "1. ", "2. ", etc. for numbered steps in procedures
5. Use **bold** for emphasis on key terms or warnings
6. Keep paragraphs concise and professional
7. Separate sections with blank lines for readability
8. DO NOT use underscores, asterisks for horizontal lines, or other unusual formatting
9. DO NOT include raw HTML tags

EXAMPLE FORMAT:
## Purpose/Overview
This procedure outlines the steps for [task description].

## Scope
This applies to all employees who [relevant criteria].

## Procedure
1. First step with clear instructions
2. Second step explaining the next action
3. Third step with any relevant details

## Safety Considerations
- Always wear appropriate PPE
- Report any hazards immediately
- Follow lockout/tagout procedures

CONTENT STRUCTURE FOR ${detectedType.toUpperCase()}:
${detectedType === "sop" ? `
## Purpose/Overview
## Scope
## Materials/Equipment Needed
## Procedure (numbered steps)
## Safety Considerations
## Quality Standards
## Documentation Requirements` : ""}
${detectedType === "policy" ? `
## Policy Statement
## Purpose
## Scope
## Policy Details
## Responsibilities
## Consequences of Non-Compliance` : ""}
${detectedType === "training" ? `
## Learning Objectives
## Introduction
## Key Concepts
## Detailed Content
## Best Practices
## Summary/Key Takeaways` : ""}
${detectedType === "safety" ? `
## Purpose
## Hazard Identification
## Required PPE
## Safety Procedures
## Emergency Procedures
## Reporting Requirements` : ""}
${detectedType === "disciplinary" ? `
## Purpose
## Scope
## Types of Misconduct
## Progressive Discipline Steps
## Documentation Requirements
## Appeal Process` : ""}

Return a JSON object with:
- "title": A clear, professional title for this document (max 100 characters, no prefix like "SOP:" needed)
- "content": The fully formatted content following the rules above
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
            content: `Please process this document (filename: ${fileName || "unknown"}) into a properly formatted ${detectedType}:\n\n${documentText.substring(0, 50000)}` 
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
          type: detectedType,
          autoDetected: autoDetect && !contentType,
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
