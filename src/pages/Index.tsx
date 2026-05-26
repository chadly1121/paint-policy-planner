import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import PointsDisplay from "@/components/gamification/PointsDisplay";
import Leaderboard from "@/components/gamification/Leaderboard";
import CertificateGenerator from "@/components/gamification/CertificateGenerator";
import RecentActivity from "@/components/dashboard/RecentActivity";
import AssignedTasks from "@/components/dashboard/AssignedTasks";
import CertificateReminders from "@/components/dashboard/CertificateReminders";
import PendingReacksCard from "@/components/dashboard/PendingReacksCard";
import SafetyRepsCard from "@/components/dashboard/SafetyRepsCard";
import { useProgress } from "@/hooks/useProgress";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useOrg } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

const MODULE_TYPES = [
  "policies",
  "sops",
  "safety",
  "msds",
  "training",
  "disciplinary",
  "forms",
] as const;

const Index = () => {
  const { t } = useTranslation();
  const { points, getCompletedSectionsCount } = useProgress();
  const { shouldShow, dismiss } = useOnboardingStatus();
  const { org } = useOrg();
  const { session } = useAuth();

  const completedCount = getCompletedSectionsCount();
  const [totalSections, setTotalSections] = useState<number | null>(null);

  // Count distinct doc categories that actually have a Drive document available
  useEffect(() => {
    let cancelled = false;
    const fetchSectionCount = async () => {
      if (!session?.access_token) return;
      try {
        const results = await Promise.all(
          MODULE_TYPES.map((folder_type) =>
            supabase.functions
              .invoke("drive-list-files", { body: { folder_type } })
              .then((r) => {
                const files = (r.data?.files ?? []).filter(
                  (f: { name?: string }) => !f.name?.startsWith("_TEMPLATE"),
                );
                return files.length > 0 ? 1 : 0;
              })
              .catch(() => 0),
          ),
        );
        if (!cancelled) {
          setTotalSections(results.reduce((a: number, b: number) => a + b, 0));
        }
      } catch {
        if (!cancelled) setTotalSections(0);
      }
    };
    fetchSectionCount();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const orgName = org?.name || t("common.companyName");
  const welcomeMessage =
    org?.onboarding_welcome_message?.trim() ||
    t("dashboard.welcome", { orgName });

  const progressDenominator = totalSections && totalSections > 0 ? totalSections : 1;
  const progressPercent = Math.min(
    100,
    Math.round((completedCount / progressDenominator) * 100),
  );

  return (
    <div className="space-y-6">
      <OnboardingWizard open={shouldShow} onComplete={dismiss} />

      <PendingReacksCard />

      {/* Points Display */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PointsDisplay />
        {totalSections !== null && totalSections > 0 && (
          <CertificateGenerator
            completedSections={completedCount}
            totalSections={totalSections}
          />
        )}
      </div>

      {/* Welcome Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="flex items-start gap-4 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              {welcomeMessage}
            </h1>
            {org?.tagline && (
              <p className="mt-1 text-sm italic text-muted-foreground">
                {org.tagline}
              </p>
            )}
            <p className="mt-2 text-muted-foreground">
              {t("dashboard.welcomeDescription")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Progress Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            {completedCount}
            {totalSections ? `/${totalSections}` : ""}
          </p>
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
            <p className="text-2xl font-bold text-primary">{progressPercent}%</p>
          </div>
          <p className="text-sm text-muted-foreground">{t("dashboard.progress")}</p>
        </div>
      </div>

      {/* Activity & Tasks Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AssignedTasks />
        <CertificateReminders />
        <RecentActivity />
        <SafetyRepsCard />
      </div>

      {/* Leaderboard */}
      <Leaderboard />
    </div>
  );
};

export default Index;
