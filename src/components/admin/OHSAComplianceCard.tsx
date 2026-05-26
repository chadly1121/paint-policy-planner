import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldAlert, ShieldCheck, Info, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrganizationContext";

const IHSA_URL =
  "https://www.ihsa.ca/courses/health-safety-representative-hsr-training";
const THREE_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 3;

interface Props {
  refreshKey?: number;
}

export default function OHSAComplianceCard({ refreshKey }: Props) {
  const { t } = useTranslation();
  const { org } = useOrg();
  const [workerCount, setWorkerCount] = useState(0);
  const [hsrTrainingDate, setHsrTrainingDate] = useState<string | null>(null);
  const [hasHsr, setHasHsr] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!org?.id) return;
      setLoading(true);
      try {
        const { data, count } = await supabase
          .from("org_users")
          .select("is_hsr, hsr_training_completed_at", {
            count: "exact",
          })
          .eq("org_id", org.id)
          .eq("is_active", true);

        if (cancelled) return;
        setWorkerCount(count ?? 0);
        const hsrRow = (data ?? []).find((u: any) => u.is_hsr);
        setHasHsr(!!hsrRow);
        setHsrTrainingDate(hsrRow?.hsr_training_completed_at ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [org?.id, refreshKey]);

  if (loading) return null;

  // Compute state
  const trainingOverdue =
    hasHsr &&
    (!hsrTrainingDate ||
      Date.now() - new Date(hsrTrainingDate).getTime() > THREE_YEARS_MS);

  let banner: {
    tone: "red" | "amber" | "blue" | "green";
    icon: typeof ShieldAlert;
    title: string;
    body: React.ReactNode;
  };

  if (workerCount >= 20) {
    banner = {
      tone: "blue",
      icon: Info,
      title: t("ohsa.jhscTitle"),
      body: t("ohsa.jhscBody"),
    };
  } else if (workerCount >= 6 && !hasHsr) {
    banner = {
      tone: "red",
      icon: ShieldAlert,
      title: t("ohsa.noHsrTitle"),
      body: t("ohsa.noHsrBody"),
    };
  } else if (trainingOverdue) {
    banner = {
      tone: "amber",
      icon: AlertTriangle,
      title: t("ohsa.trainingOverdueTitle"),
      body: (
        <>
          {t("ohsa.trainingOverdueBody")}{" "}
          <a
            href={IHSA_URL}
            target="_blank"
            rel="noreferrer"
            className="underline font-medium"
          >
            IHSA
          </a>
          .
        </>
      ),
    };
  } else {
    banner = {
      tone: "green",
      icon: ShieldCheck,
      title: t("ohsa.compliantTitle"),
      body: t("ohsa.compliantBody"),
    };
  }

  const toneClasses: Record<string, string> = {
    red: "border-destructive/40 bg-destructive/5 text-destructive",
    amber: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    blue: "border-primary/40 bg-primary/5 text-primary",
    green: "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
  };

  const Icon = banner.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-primary" />
          {t("ohsa.cardTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-2xl font-bold">{workerCount}</p>
            <p className="text-xs text-muted-foreground">{t("ohsa.activeWorkers")}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-2xl font-bold">{hasHsr ? "1" : "0"}</p>
            <p className="text-xs text-muted-foreground">{t("ohsa.hsrDesignated")}</p>
          </div>
        </div>
        <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${toneClasses[banner.tone]}`}>
          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{banner.title}</p>
            <p className="text-sm opacity-90">{banner.body}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
