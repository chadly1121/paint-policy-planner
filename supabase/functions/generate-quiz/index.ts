import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Verify the user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sectionKey, sectionContent, userId, quizType, itemKey, targetLanguage, forceNew, documentVersion, driveFileId } = await req.json();
    
    // Ensure userId matches authenticated user
    if (userId !== user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Rate limiting check - 20 quiz generations per hour per user
    const rateLimitTimestamp = Date.now();
    const hourAgo = rateLimitTimestamp - (60 * 60 * 1000);
    
    const { data: recentRequests } = await supabase
      .from("audit_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("action", "quiz_generation_request")
      .gte("created_at", new Date(hourAgo).toISOString())
      .limit(21);
    
    if (recentRequests && recentRequests.length >= 20) {
      console.warn(`Rate limit exceeded for user ${user.id}`);
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded. You can generate up to 20 quizzes per hour." 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Log this request for rate limiting
    await supabase.rpc("log_audit_event", {
      p_user_id: user.id,
      p_action: "quiz_generation_request",
      p_table_name: "quiz_questions",
    });
    
    // quizType can be: "mini" (5 questions for single item), "final" (10 questions for all items), or undefined (legacy 5 questions)
    const isMiniQuiz = quizType === "mini";
    const isFinalExam = quizType === "final";
    const questionCount = isMiniQuiz ? 5 : isFinalExam ? 10 : 5;
    
    // Language mapping for quiz generation
    const languageNames: Record<string, string> = {
      en: "English",
      es: "Spanish", 
      fr: "French",
      tl: "Tagalog (Filipino)",
    };
    const userLanguage = targetLanguage || "en";
    const languageName = languageNames[userLanguage] || "English";
    
    // Look up the latest drive_modified_time + parsed_sections for this document
    // across all doc tables. The drive_modified_time naturally rotates the cache key
    // when the source doc is edited in Drive; parsed_sections (when present) gives
    // us structured anchors so we can steer the prompt to non-negotiables/policy.
    let driveModifiedMillis = 0;
    let parsedSections: Record<string, unknown> | null = null;
    if (driveFileId) {
      const docTables = [
        "company_policies",
        "company_sops",
        "company_safety",
        "company_training",
        "company_disciplinary",
        "company_forms",
      ];
      for (const tbl of docTables) {
        const { data: row } = await supabase
          .from(tbl)
          .select("drive_modified_time, parsed_sections")
          .eq("drive_file_id", driveFileId)
          .order("drive_modified_time", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();
        if (row) {
          if (row.drive_modified_time) {
            driveModifiedMillis = new Date(row.drive_modified_time).getTime();
          }
          if (row.parsed_sections && typeof row.parsed_sections === "object") {
            parsedSections = row.parsed_sections as Record<string, unknown>;
          }
          if (driveModifiedMillis || parsedSections) break;
        }
      }
      // Fallback: sops table doesn't carry parsed_sections, just modified time.
      if (!driveModifiedMillis) {
        const { data: row } = await supabase
          .from("sops")
          .select("drive_modified_time")
          .eq("drive_file_id", driveFileId)
          .not("drive_modified_time", "is", null)
          .order("drive_modified_time", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (row?.drive_modified_time) {
          driveModifiedMillis = new Date(row.drive_modified_time).getTime();
        }
      }
    }

    // For mini quizzes, we use itemKey (e.g., "safety_safety1"), otherwise sectionKey
    // Include language + document version + drive modifiedTime in the key so quizzes
    // are regenerated whenever the source doc is edited (in-app or in Drive).
    const docVersion = Number.isFinite(Number(documentVersion)) ? Number(documentVersion) : 1;
    const baseQuizKey = isMiniQuiz && itemKey ? `${sectionKey}_${itemKey}` : sectionKey;
    const quizKey = `${baseQuizKey}_${userLanguage}_v${docVersion}_m${driveModifiedMillis}`;

    
    if (!quizKey || !sectionContent || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log(`Generating ${quizType || 'standard'} quiz for: ${quizKey}, user: ${userId}, questions: ${questionCount}, language: ${languageName}`);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Check if user already has questions for this quiz (skip if forceNew)
    if (!forceNew) {
      const { data: existingQuestions } = await supabase
        .from("quiz_questions")
        .select("id")
        .eq("user_id", userId)
        .eq("section_key", quizKey);

      if (existingQuestions && existingQuestions.length >= questionCount) {
        console.log("User already has questions for this quiz");
        const { data: questions } = await supabase
          .from("quiz_questions")
          .select("*")
          .eq("user_id", userId)
          .eq("section_key", quizKey)
          .limit(questionCount);
        
        return new Response(JSON.stringify({ questions }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.log("Force new quiz generation requested");
    }

    const systemPrompt = `You are a quiz generator for employee training documents. 
Generate exactly ${questionCount} multiple choice questions based ONLY on the document body content provided.

CRITICAL RULES:
- Questions must test understanding of the ACTUAL PROCEDURES, POLICIES, RULES, or CONCEPTS described in the document body
- Do NOT ask questions about the document title, filename, author, creation date, or metadata
- Do NOT ask questions about whether the document was AI-generated, who wrote it, or document formatting
- Do NOT ask trivial questions about headings or section names
- Focus on actionable knowledge: steps to follow, safety rules, compliance requirements, best practices
- Each question should test practical understanding an employee would need on the job
- Make questions clear and unambiguous with exactly one correct answer
- CRITICAL: You MUST generate ALL questions and ALL answer options in ${languageName}
- IGNORE any text inside square brackets like [INSERT TIME] or [TBD] — these are unfilled placeholders, not content. Never quiz on them.
- IGNORE the "Acknowledgement," "Related Procedures and Documents," "Suggested next documents," "Document ID," and document header table sections — they are boilerplate, not policy content.
- PRIORITIZE the "Non-Negotiables" section if present — these are bright-line absolute rules and make excellent quiz fodder.
- Do NOT generate "all of the above" or "none of the above" options — they are weak multiple-choice patterns.
- Each question must have exactly one defensibly correct answer that can be directly cited from a specific sentence or rule in the document body.
${isMiniQuiz ? 'Focus on the most important procedural steps and safety points from this specific document.' : 'Vary the difficulty - some straightforward recall, some requiring deeper understanding of the procedures.'}
Do NOT repeat the same question patterns. Make each question unique.`;

    // Build structured priority blocks from parsed_sections when available
    const nonNegArr = Array.isArray((parsedSections as any)?.non_negotiables)
      ? ((parsedSections as any).non_negotiables as unknown[]).filter((x) => typeof x === "string" && x.trim().length > 0) as string[]
      : [];
    const hasPriorityNonNeg = nonNegArr.length >= 2;
    const policyStatement = typeof (parsedSections as any)?.policy_statement === "string"
      ? (parsedSections as any).policy_statement as string
      : null;
    const procSteps = Array.isArray((parsedSections as any)?.procedure_steps)
      ? ((parsedSections as any).procedure_steps as unknown[]).filter((x) => typeof x === "string" && x.trim().length > 0) as string[]
      : [];

    const priorityBlock = hasPriorityNonNeg
      ? `\nPRIORITY CONTENT — draw at least 2 questions from this section if generating 5 or more total questions (these are bright-line, non-negotiable rules):\n${nonNegArr.map((n, i) => `${i + 1}. ${n}`).join("\n")}\n`
      : "";

    let structuredBody = "";
    if (policyStatement && policyStatement.trim().length > 0) {
      structuredBody += `\nPOLICY STATEMENT:\n${policyStatement}\n`;
    }
    if (procSteps.length > 0) {
      structuredBody += `\nPROCEDURE STEPS:\n${procSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n`;
    }

    // Fall back to raw sectionContent if we have no structured body (some docs predate the parser)
    const bodyForPrompt = structuredBody.trim().length > 0 ? structuredBody : sectionContent;

    const userPrompt = `Generate ${questionCount} multiple choice questions testing employee knowledge of this ${isMiniQuiz ? 'procedure document' : 'training material'}.

IMPORTANT RULES:
- Generate all questions and answers in ${languageName}
- Questions must be about the CONTENT and PROCEDURES described, NOT about document metadata
- Focus on practical knowledge: what employees should DO, AVOID, or UNDERSTAND
- Do NOT ask about document titles, authors, or formatting
${priorityBlock}
Document content to create questions from:
${bodyForPrompt}

For each question, provide:
1. A clear, practical question about the procedures or policies (in ${languageName})
2. Exactly 4 answer options A, B, C, D (in ${languageName})
3. The index of the correct answer (0 for A, 1 for B, 2 for C, 3 for D)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_quiz_questions",
              description: `Create ${questionCount} multiple choice quiz questions`,
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          minItems: 4,
                          maxItems: 4,
                        },
                        correct_answer: { type: "integer", minimum: 0, maximum: 3 },
                      },
                      required: ["question", "options", "correct_answer"],
                    },
                    minItems: questionCount,
                    maxItems: questionCount,
                  },
                },
                required: ["questions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_quiz_questions" } },
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response received");

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "create_quiz_questions") {
      throw new Error("Invalid AI response format");
    }

    const quizData = JSON.parse(toolCall.function.arguments);
    const generatedQuestions = quizData.questions;

    // Delete any existing questions for this user/quiz
    await supabase
      .from("quiz_questions")
      .delete()
      .eq("user_id", userId)
      .eq("section_key", quizKey);

    // Insert new questions
    const questionsToInsert = generatedQuestions.map((q: any) => ({
      user_id: userId,
      section_key: quizKey,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from("quiz_questions")
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting questions:", insertError);
      throw insertError;
    }

    console.log(`Successfully generated ${insertedQuestions.length} questions`);

    return new Response(JSON.stringify({ questions: insertedQuestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
