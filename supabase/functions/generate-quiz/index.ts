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
    const { sectionKey, sectionContent, userId } = await req.json();
    
    console.log(`Generating quiz for section: ${sectionKey}, user: ${userId}`);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already has questions for this section
    const { data: existingQuestions } = await supabase
      .from("quiz_questions")
      .select("id")
      .eq("user_id", userId)
      .eq("section_key", sectionKey);

    if (existingQuestions && existingQuestions.length >= 5) {
      console.log("User already has questions for this section");
      const { data: questions } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("user_id", userId)
        .eq("section_key", sectionKey)
        .limit(5);
      
      return new Response(JSON.stringify({ questions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a quiz generator for an employee training manual. 
Generate exactly 5 multiple choice questions based on the provided content.
Each question should test understanding of key concepts, procedures, or rules.
Make questions clear and unambiguous with exactly one correct answer.
Vary the difficulty slightly - some straightforward, some requiring deeper understanding.
Do NOT repeat the same question patterns. Make each question unique.`;

    const userPrompt = `Generate 5 multiple choice questions for this section of the employee manual:

${sectionContent}

For each question, provide:
1. A clear question
2. Exactly 4 answer options (A, B, C, D)
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
              description: "Create 5 multiple choice quiz questions",
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
                    minItems: 5,
                    maxItems: 5,
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

    // Delete any existing questions for this user/section
    await supabase
      .from("quiz_questions")
      .delete()
      .eq("user_id", userId)
      .eq("section_key", sectionKey);

    // Insert new questions
    const questionsToInsert = generatedQuestions.map((q: any) => ({
      user_id: userId,
      section_key: sectionKey,
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
