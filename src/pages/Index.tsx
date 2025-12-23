import { useTranslation } from "react-i18next";
import {
  ClipboardList,
  Shield,
  FileText,
  GraduationCap,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import SectionCard from "@/components/manual/SectionCard";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const { t } = useTranslation();

  const sections = [
    {
      title: t("sections.sops.title"),
      description: t("sections.sops.description"),
      icon: ClipboardList,
      path: "/sops",
      itemCount: 12,
    },
    {
      title: t("sections.safety.title"),
      description: t("sections.safety.description"),
      icon: Shield,
      path: "/safety",
      itemCount: 6,
    },
    {
      title: t("sections.policies.title"),
      description: t("sections.policies.description"),
      icon: FileText,
      path: "/policies",
      itemCount: 10,
    },
    {
      title: t("sections.training.title"),
      description: t("sections.training.description"),
      icon: GraduationCap,
      path: "/training",
      itemCount: 5,
    },
    {
      title: t("sections.disciplinary.title"),
      description: t("sections.disciplinary.description"),
      icon: AlertTriangle,
      path: "/disciplinary",
      itemCount: 4,
    },
  ];

  return (
    <div className="space-y-8">
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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">37</p>
          <p className="text-sm text-muted-foreground">{t("dashboard.totalPolicies")}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">5</p>
          <p className="text-sm text-muted-foreground">{t("dashboard.sections")}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">12</p>
          <p className="text-sm text-muted-foreground">{t("dashboard.sopsCount")}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">6</p>
          <p className="text-sm text-muted-foreground">{t("dashboard.safetyRules")}</p>
        </div>
      </div>

      {/* Section Cards */}
      <div>
        <h3 className="mb-4 font-serif text-lg font-semibold text-foreground">
          {t("dashboard.manualSections")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <SectionCard key={section.path} {...section} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
