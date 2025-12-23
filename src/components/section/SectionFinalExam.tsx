import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, Lock, Trophy, CheckCircle2 } from "lucide-react";

interface SectionFinalExamProps {
  sectionTitle: string;
  completedCount: number;
  totalCount: number;
  isFinalExamCompleted: boolean;
  onStartFinalExam: () => void;
}

const SectionFinalExam = ({
  sectionTitle,
  completedCount,
  totalCount,
  isFinalExamCompleted,
  onStartFinalExam,
}: SectionFinalExamProps) => {
  const { t } = useTranslation();
  const isUnlocked = completedCount >= totalCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (isFinalExamCompleted) {
    return (
      <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                {t("section.finalExamCompleted")}
              </CardTitle>
              <CardDescription className="text-green-600 dark:text-green-400">
                {t("section.finalExamCompletedDesc", { section: sectionTitle })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Badge className="bg-green-500 text-white text-lg px-4 py-2">
            +100 {t("common.points")}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${isUnlocked ? 'border-primary bg-primary/5' : 'border-muted bg-muted/30'}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isUnlocked ? 'bg-primary' : 'bg-muted'}`}>
            {isUnlocked ? (
              <Award className="h-6 w-6 text-primary-foreground" />
            ) : (
              <Lock className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <CardTitle className={isUnlocked ? '' : 'text-muted-foreground'}>
              {sectionTitle} {t("section.finalExam")}
            </CardTitle>
            <CardDescription>
              {isUnlocked
                ? t("section.finalExamReady")
                : t("section.finalExamLocked", { completed: completedCount, total: totalCount })}
            </CardDescription>
          </div>
          <Badge variant={isUnlocked ? "default" : "secondary"} className="text-lg px-3 py-1">
            100 {t("common.points")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("section.miniQuizzesCompleted")}</span>
            <span className="font-medium">{completedCount} / {totalCount}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
        
        {isUnlocked ? (
          <Button onClick={onStartFinalExam} className="w-full" size="lg">
            <Award className="h-5 w-5 mr-2" />
            {t("section.startFinalExam")} (10 {t("quiz.questions")})
          </Button>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {t("section.completeAllMiniQuizzes")}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default SectionFinalExam;
