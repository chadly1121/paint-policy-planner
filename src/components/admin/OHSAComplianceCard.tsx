import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldAlert, ShieldCheck, Info, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrganizationContext";

const IHSA_URL =
  "https://www.ihsa.ca/courses/health-safety-representative-hsr-training";
const THREE_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 3;

interface Props {
  refreshKey?: number;
  onOpenComplianceTab?: () => void;
}

interface WorkforceCounts {
  total: number;
  green: number;
  amber: number;
  red: number;
}

export default function OHSAComplianceCard({ refreshKey, onOpenComplianceTab }: Props) {
  const { t } = useTranslation();
  const { org } = useOrg();
  const [workerCount, setWorkerCount] = useState(0);
  const [hsrTrainingDate, setHsrTrainingDate] = useState<string | null>(null);
  const [hasHsr, setHasHsr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workforce, setWorkforce] = useState<WorkforceCounts | null>(null);
  const [workforceLoading, setWorkforceLoading] = useState(true);

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

  // Workforce certification status — aggregate per active member
  useEffect(() => {
    let cancelled = false;
    const loadWorkforce = async () => {
      if (!org?.id) return;
      setWorkforceLoading(true);
      try {
        const { data: members } = await supabase
          .from("org_users")
          .select("user_id")
          .eq("org_id", org.id)
          .eq("is_active", true);

        if (cancelled || !members) return;

        const counts: WorkforceCounts = { total: members.length, green: 0, amber: 0, red: 0 };
        await Promise.all(
          members.map(async (m: any) => {
            const { data: rows } = await (supabase as any).rpc("get_user_cert_compliance", {
              _user_id: m.user_id,
              _org_id: org.id,
            });
            const list = (rows || []) as Array<{ status: string }>;
            if (list.length === 0) {
              counts.green += 1; // no requirements => compliant
              return;
            }
            if (list.some((r) => r.status === "missing" || r.status === "expired")) {
              counts.red += 1;
            } else if (list.some((r) => r.status === "expiring_soon")) {
              counts.amber += 1;
            } else {
              counts.green += 1;
            }
          }),
        );
        if (!cancelled) setWorkforce(counts);
      } finally {
        if (!cancelled) setWorkforceLoading(false);
      }
    };
    void loadWorkforce();
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

        {/* Workforce Certification Status */}
        <div className="rounded-md border border-border bg-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Workforce Certification Status</p>
            {onOpenComplianceTab && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onOpenComplianceTab}
              >
                Manage <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
          {workforceLoading || !workforce ? (
            <p className="text-xs text-muted-foreground">Loading compliance…</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded border bg-muted/40 p-2">
                <p className="text-lg font-bold">{workforce.total}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Workers</p>
              </div>
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2">
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{workforce.green}</p>
                <p className="text-[10px] uppercase tracking-wide text-emerald-700/80 dark:text-emerald-400/80">Compliant</p>
              </div>
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2">
                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{workforce.amber}</p>
                <p className="text-[10px] uppercase tracking-wide text-amber-700/80 dark:text-amber-400/80">Expiring</p>
              </div>
              <div className="rounded border border-destructive/30 bg-destructive/10 p-2">
                <p className="text-lg font-bold text-destructive">{workforce.red}</p>
                <p className="text-[10px] uppercase tracking-wide text-destructive/80">Action needed</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
