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

    const { sectionKey, answers, userId, quizType, sopKey } = await req.json();

    // quizType can be: "mini" (SOP mini-quiz), "final" (SOP final exam), or undefined (legacy)
    const isMiniQuiz = quizType === "mini";
    const isFinalExam = quizType === "final";
    const quizKey = isMiniQuiz ? sopKey : sectionKey;

    console.log(`Processing ${quizType || 'standard'} quiz submission for: ${quizKey}, user: ${userId}`);

    if (!quizKey || !answers || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the actual questions with correct answers (server-side only)
    const { data: questions, error: questionsError } = await supabase
      .from("quiz_questions")
      .select("id, question, options, correct_answer")
      .eq("user_id", userId)
      .eq("section_key", quizKey);

    if (questionsError) {
      console.error("Error fetching questions:", questionsError);
      throw questionsError;
    }

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No questions found for this quiz" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${questions.length} questions for validation`);

    // Calculate score server-side
    let score = 0;
    const totalQuestions = questions.length;

    questions.forEach((q, idx) => {
      const userAnswer = answers[idx];
      if (userAnswer !== undefined && userAnswer === q.correct_answer) {
        score++;
      }
    });

    const passed = score === totalQuestions;
    
    // Points: mini-quiz = 10, final exam = 100, legacy = 100
    const pointsValue = isMiniQuiz ? 10 : 100;
    const pointsEarned = passed ? pointsValue : 0;

    console.log(`Quiz result: ${score}/${totalQuestions}, passed: ${passed}, type: ${quizType || 'standard'}`);

    // Record the attempt using service role (bypasses RLS)
    const { error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({
        user_id: userId,
        section_key: quizKey,
        score,
        total_questions: totalQuestions,
        passed,
        points_earned: pointsEarned,
      });

    if (attemptError) {
      console.error("Error recording attempt:", attemptError);
      throw attemptError;
    }

    let alreadyCompleted = false;
    
    // If passed, update progress and points
    if (passed) {
      if (isMiniQuiz) {
        // Check if SOP already completed
        const { data: existingProgress } = await supabase
          .from("sop_quiz_progress")
          .select("completed")
          .eq("user_id", userId)
          .eq("sop_key", sopKey)
          .single();

        alreadyCompleted = existingProgress?.completed === true;

        if (!alreadyCompleted) {
          // Update SOP progress
          const { error: sopProgressError } = await supabase
            .from("sop_quiz_progress")
            .upsert({
              user_id: userId,
              sop_key: sopKey,
              completed: true,
              completed_at: new Date().toISOString(),
              points_earned: pointsEarned,
            }, { onConflict: "user_id,sop_key" });

          if (sopProgressError) {
            console.error("SOP progress update error:", sopProgressError);
          }
        }
      } else {
        // Check if section already completed (for final exam or legacy quizzes)
        const { data: existingProgress } = await supabase
          .from("section_progress")
          .select("completed")
          .eq("user_id", userId)
          .eq("section_key", sectionKey)
          .single();

        alreadyCompleted = existingProgress?.completed === true;

        if (!alreadyCompleted) {
          // Update section progress
          const { error: progressError } = await supabase
            .from("section_progress")
            .upsert({
              user_id: userId,
              section_key: sectionKey,
              completed: true,
              completed_at: new Date().toISOString(),
            }, { onConflict: "user_id,section_key" });

          if (progressError) {
            console.error("Progress update error:", progressError);
          }
        }
      }

      // Only award points if not already completed
      if (!alreadyCompleted) {
        // Update points balance
        const { data: currentBalance } = await supabase
          .from("points_balance")
          .select("total_points, available_points, redeemed_points")
          .eq("user_id", userId)
          .single();

        const currentTotal = currentBalance?.total_points || 0;
        const currentRedeemed = currentBalance?.redeemed_points || 0;
        const newTotal = currentTotal + pointsEarned;
        const newAvailable = newTotal - currentRedeemed;

        const { error: pointsError } = await supabase
          .from("points_balance")
          .upsert({
            user_id: userId,
            total_points: newTotal,
            available_points: newAvailable,
            redeemed_points: currentRedeemed,
          }, { onConflict: "user_id" });

        if (pointsError) {
          console.error("Points update error:", pointsError);
        }

        console.log(`Points updated: ${currentTotal} -> ${newTotal}`);
      } else {
        console.log("Quiz already completed, no additional points awarded");
      }
    }

    // Return correct answers only AFTER quiz is submitted (for review)
    const questionsWithAnswers = questions.map((q: any) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
    }));

    return new Response(
      JSON.stringify({
        score,
        total: totalQuestions,
        passed,
        pointsEarned: passed && !alreadyCompleted ? pointsEarned : 0,
        questions: questionsWithAnswers,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error submitting quiz:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
