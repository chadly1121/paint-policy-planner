import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuiz } from "@/hooks/useQuiz";
import { useTranslatedTitle } from "@/hooks/useTranslatedTitle";
import { CheckCircle2, XCircle, Loader2, Trophy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizModalProps {
  open: boolean;
  onClose: () => void;
  sectionKey: string;
  sectionTitle: string;
  sectionContent: string;
  onComplete: (passed: boolean) => void;
  quizType?: "mini" | "final";
  itemKey?: string;
}

const QuizModal = ({
  open,
  onClose,
  sectionKey,
  sectionTitle,
  sectionContent,
  onComplete,
  quizType,
  itemKey,
}: QuizModalProps) => {
  // Translate the quiz title
  const { translatedTitle, loading: titleLoading } = useTranslatedTitle(sectionTitle);
  const {
    loading,
    questions,
    reviewQuestions,
    currentQuestionIndex,
    answers,
    quizComplete,
    lastAttempt,
    previousWrongCount,
    generateQuiz,
    selectAnswer,
    nextQuestion,
    previousQuestion,
    submitQuiz,
    resetQuiz,
  } = useQuiz();

  useEffect(() => {
    if (open && questions.length === 0) {
      generateQuiz(sectionKey, sectionContent, quizType, itemKey);
    }
  }, [open, sectionKey, sectionContent, generateQuiz, questions.length, quizType, itemKey]);

  const handleClose = () => {
    resetQuiz();
    onClose();
  };

  const handleSubmit = async () => {
    const result = await submitQuiz(sectionKey, quizType, itemKey);
    if (result) {
      onComplete(result.passed);
    }
  };

  const handleRetry = () => {
    resetQuiz();
    // Force new quiz generation on retry - don't use cached questions
    generateQuiz(sectionKey, sectionContent, quizType, itemKey, true);
  };

  const questionCount = quizType === "mini" ? 5 : quizType === "final" ? 10 : 5;
  const pointsValue = quizType === "mini" ? 10 : 100;

  const currentQuestion = questions[currentQuestionIndex];
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;
  const progressPercent = questions.length > 0 
    ? ((Object.keys(answers).length) / questions.length) * 100 
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {quizComplete ? "Quiz Results" : `Quiz: ${titleLoading ? sectionTitle : translatedTitle}`}
          </DialogTitle>
          <DialogDescription>
            {quizComplete
              ? "See how you did on the quiz"
              : `Answer all ${questionCount} questions correctly to ${quizType === 'mini' ? 'complete this SOP' : 'unlock the next section'}`}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Generating your personalized quiz...</p>
          </div>
        )}

        {!loading && !quizComplete && currentQuestion && (
          <div className="space-y-6">
            {previousWrongCount > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200">
                You missed {previousWrongCount} {previousWrongCount === 1 ? "question" : "questions"} last time. Focus on those — review them in the doc and try again.
              </div>
            )}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>{Object.keys(answers).length} answered</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">{currentQuestion.question}</h3>
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectAnswer(currentQuestionIndex, idx)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-all",
                      answers[currentQuestionIndex] === idx
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    )}
                  >
                    <span className="font-medium mr-2">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>
              <div className="flex gap-2">
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button onClick={nextQuestion}>Next</Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={!allAnswered}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Submit Quiz
                  </Button>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-2">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const diff = idx - currentQuestionIndex;
                    if (diff > 0) {
                      for (let i = 0; i < diff; i++) nextQuestion();
                    } else {
                      for (let i = 0; i < -diff; i++) previousQuestion();
                    }
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full text-sm font-medium transition-all",
                    idx === currentQuestionIndex
                      ? "bg-primary text-primary-foreground"
                      : answers[idx] !== undefined
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && quizComplete && lastAttempt && (
          <div className="space-y-6 text-center py-4">
            {lastAttempt.passed ? (
              <>
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Trophy className="h-10 w-10 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-green-600 mb-2">You Passed!</h3>
                  <p className="text-muted-foreground">
                    You got {lastAttempt.score} out of {lastAttempt.total} correct.
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                    +{lastAttempt.pointsEarned} Points Earned! 🎉
                  </p>
                </div>
                <Button onClick={handleClose} size="lg">
                  Continue to Next Section
                </Button>
              </>
            ) : (
              <>
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-10 w-10 text-destructive" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-destructive mb-2">Not Quite!</h3>
                  <p className="text-muted-foreground">
                    You got {lastAttempt.score} out of {lastAttempt.total} correct.
                  </p>
                  <p className="text-muted-foreground mt-1">
                    You need 80% to pass. Review the material and try again.
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Review your answers:</h4>
                  <div className="space-y-2 text-left max-h-48 overflow-y-auto">
                    {reviewQuestions.map((q, idx) => (
                      <div
                        key={q.id}
                        className={cn(
                          "p-3 rounded-lg flex items-start gap-3",
                          answers[idx] === q.correct_answer
                            ? "bg-green-50 dark:bg-green-900/20"
                            : "bg-destructive/10"
                        )}
                      >
                        {answers[idx] === q.correct_answer ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{q.question}</p>
                          {answers[idx] !== q.correct_answer && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Correct: {q.options[q.correct_answer]}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={handleClose}>
                    Review Material
                  </Button>
                  <Button onClick={handleRetry}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuizModal;
