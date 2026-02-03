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

    const { sectionKey, sectionContent, userId, quizType, itemKey, targetLanguage } = await req.json();
    
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
    
    // For mini quizzes, we use itemKey (e.g., "safety_safety1"), otherwise sectionKey
    // Include language in the key so quizzes are regenerated per language
    const baseQuizKey = isMiniQuiz && itemKey ? `${sectionKey}_${itemKey}` : sectionKey;
    const quizKey = `${baseQuizKey}_${userLanguage}`;
    
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

    // Check if user already has questions for this quiz
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

    const systemPrompt = `You are a quiz generator for an employee training manual. 
Generate exactly ${questionCount} multiple choice questions based on the provided content.
Each question should test understanding of key concepts, procedures, or rules.
Make questions clear and unambiguous with exactly one correct answer.
CRITICAL: You MUST generate ALL questions and ALL answer options in ${languageName}. 
The content may be in any language, but your output must be entirely in ${languageName}.
${isMiniQuiz ? 'Focus on the most important points from this specific procedure.' : 'Vary the difficulty - some straightforward, some requiring deeper understanding.'}
Do NOT repeat the same question patterns. Make each question unique.`;

    const userPrompt = `Generate ${questionCount} multiple choice questions for this ${isMiniQuiz ? 'standard operating procedure' : 'section of the employee manual'}.
IMPORTANT: Generate all questions and answers in ${languageName}.

Content to create questions from:
${sectionContent}

For each question, provide:
1. A clear question (in ${languageName})
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
