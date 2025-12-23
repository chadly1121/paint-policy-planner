import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
}

interface QuizAttempt {
  score: number;
  total: number;
  passed: boolean;
  pointsEarned: number;
}

export const useQuiz = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizComplete, setQuizComplete] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null);

  const generateQuiz = useCallback(async (sectionKey: string, sectionContent: string) => {
    if (!user) return;

    setLoading(true);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setQuizComplete(false);
    setLastAttempt(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { sectionKey, sectionContent, userId: user.id },
      });

      if (error) throw error;

      if (data?.questions) {
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast({
        variant: "destructive",
        title: "Failed to generate quiz",
        description: "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const selectAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: answerIndex }));
  }, []);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  }, [currentQuestionIndex, questions.length]);

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  }, [currentQuestionIndex]);

  const submitQuiz = useCallback(async (sectionKey: string) => {
    if (!user || questions.length === 0) return null;

    setLoading(true);
    try {
      let score = 0;
      questions.forEach((q, idx) => {
        if (answers[idx] === q.correct_answer) {
          score++;
        }
      });

      const passed = score === questions.length;
      const pointsEarned = passed ? 100 : 0; // 100 points for perfect score

      // Record attempt
      const { error: attemptError } = await supabase
        .from("quiz_attempts")
        .insert({
          user_id: user.id,
          section_key: sectionKey,
          score,
          total_questions: questions.length,
          passed,
          points_earned: pointsEarned,
        });

      if (attemptError) throw attemptError;

      // If passed, update section progress and points
      if (passed) {
        // Update section progress
        const { error: progressError } = await supabase
          .from("section_progress")
          .upsert({
            user_id: user.id,
            section_key: sectionKey,
            completed: true,
            completed_at: new Date().toISOString(),
          }, { onConflict: "user_id,section_key" });

        if (progressError) console.error("Progress update error:", progressError);

        // Update points balance
        const { data: currentBalance } = await supabase
          .from("points_balance")
          .select("total_points")
          .eq("user_id", user.id)
          .single();

        const newTotal = (currentBalance?.total_points || 0) + pointsEarned;

        await supabase
          .from("points_balance")
          .upsert({
            user_id: user.id,
            total_points: newTotal,
            redeemed_points: 0,
          }, { onConflict: "user_id" });
      }

      const attempt: QuizAttempt = {
        score,
        total: questions.length,
        passed,
        pointsEarned,
      };

      setLastAttempt(attempt);
      setQuizComplete(true);

      if (passed) {
        toast({
          title: "Congratulations! 🎉",
          description: `Perfect score! You earned ${pointsEarned} points.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Not quite!",
          description: `You got ${score}/${questions.length}. You need 5/5 to pass. Try again!`,
        });
      }

      return attempt;
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast({
        variant: "destructive",
        title: "Failed to submit quiz",
        description: "Please try again.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, questions, answers, toast]);

  const resetQuiz = useCallback(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setQuizComplete(false);
    setLastAttempt(null);
  }, []);

  return {
    loading,
    questions,
    currentQuestionIndex,
    answers,
    quizComplete,
    lastAttempt,
    generateQuiz,
    selectAnswer,
    nextQuestion,
    previousQuestion,
    submitQuiz,
    resetQuiz,
  };
};
