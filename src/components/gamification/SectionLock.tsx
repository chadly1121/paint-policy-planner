import { Lock, CheckCircle2, Circle, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionLockProps {
  isUnlocked: boolean;
  isCompleted: boolean;
  sectionTitle: string;
  onStartQuiz?: () => void;
}

const SectionLock = ({
  isUnlocked,
  isCompleted,
  sectionTitle,
  onStartQuiz,
}: SectionLockProps) => {
  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
        <CheckCircle2 className="h-4 w-4" />
        <span>Section completed - Quiz passed!</span>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/50 px-3 py-2 rounded-lg">
        <Lock className="h-4 w-4" />
        <span>Complete the previous section quiz to unlock</span>
      </div>
    );
  }

  return (
    <button
      onClick={onStartQuiz}
      className={cn(
        "flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all",
        "bg-primary/10 text-primary hover:bg-primary/20",
        "border border-primary/20 hover:border-primary/40"
      )}
    >
      <Play className="h-4 w-4" />
      <span>Take Quiz to Unlock Next Section</span>
    </button>
  );
};

export default SectionLock;
