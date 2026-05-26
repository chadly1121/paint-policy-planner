import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldAlert, ShieldCheck, AlertOctagon, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrganizationContext";

interface SafetyRep {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_hsr: boolean;
  is_safety_supervisor: boolean;
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function SafetyRepsCard() {
  const { t } = useTranslation();
  const { org } = useOrg();
  const [reps, setReps] = useState<SafetyRep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!org?.id) return;
      setLoading(true);
      try {
        const { data: orgUsers } = await supabase
          .from("org_users")
          .select("user_id, is_hsr, is_safety_supervisor")
          .eq("org_id", org.id)
          .eq("is_active", true);

        const flagged = (orgUsers ?? []).filter(
          (u: any) => u.is_hsr || u.is_safety_supervisor,
        );
        if (flagged.length === 0) {
          if (!cancelled) setReps([]);
          return;
        }

        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url")
          .in(
            "user_id",
            flagged.map((u: any) => u.user_id),
          );

        const profMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
        const merged: SafetyRep[] = flagged.map((u: any) => {
          const p = profMap.get(u.user_id);
          return {
            user_id: u.user_id,
            full_name: p?.full_name ?? "Unnamed",
            email: p?.email ?? "",
            avatar_url: p?.avatar_url ?? null,
            is_hsr: !!u.is_hsr,
            is_safety_supervisor: !!u.is_safety_supervisor,
          };
        });
        if (!cancelled) setReps(merged);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [org?.id]);

  const hsr = reps.find((r) => r.is_hsr);
  const supervisors = reps.filter((r) => r.is_safety_supervisor);

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-primary" />
          {t("safetyReps.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* HSR */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("safetyReps.hsrHeading")}
          </p>
          {hsr ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {hsr.avatar_url && <AvatarImage src={hsr.avatar_url} />}
                <AvatarFallback>{initials(hsr.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{hsr.full_name}</p>
                {hsr.email && (
                  <a
                    href={`mailto:${hsr.email}`}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                  >
                    <Mail className="h-3 w-3" />
                    {hsr.email}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{t("safetyReps.noHsr")}</span>
            </div>
          )}
        </div>

        {/* Safety Supervisors */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("safetyReps.supervisorsHeading")}
          </p>
          {supervisors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("safetyReps.noSupervisors")}
            </p>
          ) : (
            <div className="space-y-2">
              {supervisors.map((s) => (
                <div key={s.user_id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {s.avatar_url && <AvatarImage src={s.avatar_url} />}
                    <AvatarFallback>{initials(s.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.full_name}</p>
                    {s.email && (
                      <a
                        href={`mailto:${s.email}`}
                        className="text-xs text-muted-foreground hover:text-primary"
                      >
                        {s.email}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Concern actions */}
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("safetyReps.concernHeading")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/incidents">
                <AlertOctagon className="mr-1 h-4 w-4" />
                {t("safetyReps.fileIncident")}
              </Link>
            </Button>
            {hsr?.email && (
              <Button asChild size="sm" variant="outline">
                <a href={`mailto:${hsr.email}`}>
                  <Mail className="mr-1 h-4 w-4" />
                  {t("safetyReps.contactHsr")}
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
