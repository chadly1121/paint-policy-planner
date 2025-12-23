import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

interface QuizQuestionWithAnswer extends QuizQuestion {
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
  const [reviewQuestions, setReviewQuestions] = useState<QuizQuestionWithAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizComplete, setQuizComplete] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null);

  const generateQuiz = useCallback(async (sectionKey: string, sectionContent: string) => {
    if (!user) return;

    setLoading(true);
    setQuestions([]);
    setReviewQuestions([]);
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
        // Map questions to remove correct_answer from client state (extra safety)
        const safeQuestions = data.questions.map((q: any) => ({
          id: q.id,
          question: q.question,
          options: q.options,
        }));
        setQuestions(safeQuestions);
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
      // Submit answers to server for secure validation
      const { data, error } = await supabase.functions.invoke("submit-quiz", {
        body: { 
          sectionKey, 
          answers, 
          userId: user.id 
        },
      });

      if (error) throw error;

      // Store questions with answers for review (only available after submission)
      if (data.questions) {
        setReviewQuestions(data.questions);
      }

      const attempt: QuizAttempt = {
        score: data.score,
        total: data.total,
        passed: data.passed,
        pointsEarned: data.pointsEarned,
      };

      setLastAttempt(attempt);
      setQuizComplete(true);

      if (data.passed) {
        // Send email notification for section completion (fire and forget)
        if (data.pointsEarned > 0) {
          supabase.functions.invoke("send-notification", {
            body: {
              type: "section_completed",
              userId: user.id,
              data: { sectionKey, pointsEarned: data.pointsEarned },
            },
          }).catch(console.error);
        }

        toast({
          title: "Congratulations! 🎉",
          description: data.pointsEarned > 0 
            ? `Perfect score! You earned ${data.pointsEarned} points.`
            : `Perfect score! (Section already completed)`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Not quite!",
          description: `You got ${data.score}/${data.total}. You need ${data.total}/${data.total} to pass. Try again!`,
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
    setReviewQuestions([]);
  }, []);

  return {
    loading,
    questions,
    reviewQuestions,
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
