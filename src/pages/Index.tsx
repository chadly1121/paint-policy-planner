import { useTranslation } from "react-i18next";
import {
  ClipboardList,
  Shield,
  FileText,
  GraduationCap,
  AlertTriangle,
  BookOpen,
  Trophy,
  CheckCircle2,
  Lock,
} from "lucide-react";
import SectionCard from "@/components/manual/SectionCard";
import { Card, CardContent } from "@/components/ui/card";
import PointsDisplay from "@/components/gamification/PointsDisplay";
import Leaderboard from "@/components/gamification/Leaderboard";
import CertificateGenerator from "@/components/gamification/CertificateGenerator";
import { useProgress } from "@/hooks/useProgress";

const Index = () => {
  const { t } = useTranslation();
  const { progress, points, isSectionUnlocked, getCompletedSectionsCount } = useProgress();

  const completedCount = getCompletedSectionsCount();
  
  const getSectionStatus = (sectionKey: string) => {
    const isCompleted = progress.some(p => p.section_key === sectionKey && p.completed);
    const isUnlocked = isSectionUnlocked(sectionKey);
    return { isCompleted, isUnlocked };
  };

  const sections = [
    {
      title: t("sections.sops.title"),
      description: t("sections.sops.description"),
      icon: ClipboardList,
      path: "/sops",
      itemCount: 22,
      sectionKey: "sops",
    },
    {
      title: t("sections.safety.title"),
      description: t("sections.safety.description"),
      icon: Shield,
      path: "/safety",
      itemCount: 6,
      sectionKey: "safety",
    },
    {
      title: t("sections.policies.title"),
      description: t("sections.policies.description"),
      icon: FileText,
      path: "/policies",
      itemCount: 10,
      sectionKey: "policies",
    },
    {
      title: t("sections.training.title"),
      description: t("sections.training.description"),
      icon: GraduationCap,
      path: "/training",
      itemCount: 5,
      sectionKey: "training",
    },
    {
      title: t("sections.disciplinary.title"),
      description: t("sections.disciplinary.description"),
      icon: AlertTriangle,
      path: "/disciplinary",
      itemCount: 4,
      sectionKey: "disciplinary",
    },
  ];

  return (
    <div className="space-y-8">
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

      {/* Section Cards */}
      <div>
        <h3 className="mb-4 font-serif text-lg font-semibold text-foreground">
          {t("dashboard.manualSections")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const { isCompleted, isUnlocked } = getSectionStatus(section.sectionKey);
            return (
              <div key={section.path} className="relative">
                <SectionCard {...section} />
                <div className="absolute top-3 right-3">
                  {isCompleted ? (
                    <div className="flex items-center gap-1 bg-green-500/20 text-green-600 px-2 py-1 rounded-full text-xs">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Complete</span>
                    </div>
                  ) : !isUnlocked ? (
                    <div className="flex items-center gap-1 bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs">
                      <Lock className="h-3 w-3" />
                      <span>Locked</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <Leaderboard />
    </div>
  );
};

export default Index;
