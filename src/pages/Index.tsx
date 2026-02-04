import { useTranslation } from "react-i18next";
import { BookOpen, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import PointsDisplay from "@/components/gamification/PointsDisplay";
import Leaderboard from "@/components/gamification/Leaderboard";
import CertificateGenerator from "@/components/gamification/CertificateGenerator";
import RecentActivity from "@/components/dashboard/RecentActivity";
import AssignedTasks from "@/components/dashboard/AssignedTasks";
import CertificateReminders from "@/components/dashboard/CertificateReminders";
import { useProgress } from "@/hooks/useProgress";

const Index = () => {
  const { t } = useTranslation();
  const { points, getCompletedSectionsCount } = useProgress();

  const completedCount = getCompletedSectionsCount();

  return (
    <div className="space-y-6">
      {/* Points Display */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PointsDisplay />
        <CertificateGenerator completedSections={completedCount} totalSections={5} />
      </div>

      {/* Welcome Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="flex items-start gap-4 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground">
              {t("dashboard.welcome")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("dashboard.welcomeDescription")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Progress Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{completedCount}/5</p>
          <p className="text-sm text-muted-foreground">{t("dashboard.sectionsCompleted")}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{points?.total_points ?? 0}</p>
          <p className="text-sm text-muted-foreground">{t("dashboard.totalPoints")}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{points?.available_points ?? 0}</p>
          <p className="text-sm text-muted-foreground">{t("dashboard.availablePoints")}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <Trophy className="h-5 w-5 text-primary" />
            <p className="text-2xl font-bold text-primary">
              {completedCount === 5 ? "100%" : `${Math.round((completedCount / 5) * 100)}%`}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{t("dashboard.progress")}</p>
        </div>
      </div>

      {/* Activity & Tasks Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AssignedTasks />
        <CertificateReminders />
        <RecentActivity />
      </div>

      {/* Leaderboard */}
      <Leaderboard />
    </div>
  );
};

export default Index;
