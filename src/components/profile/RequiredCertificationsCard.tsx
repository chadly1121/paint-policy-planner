import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, Upload } from "lucide-react";

export interface RequiredCert {
  cert_type: string;
  cert_display_name: string;
  description: string | null;
  regulatory_reference: string | null;
  status: "missing" | "expired" | "expiring_soon" | "valid" | "no_expiry";
  latest_cert_id: string | null;
  expiry_date: string | null;
  days_until_expiry: number | null;
  renewal_interval_months: number | null;
  notice_period_days: number;
}

interface Props {
  userId: string;
  isOwnProfile: boolean;
  onUploadClick: (prefill: { certType: string; displayName: string }) => void;
  /** Optional ref to refresh externally */
  refreshKey?: number;
}

function statusBadge(row: RequiredCert) {
  switch (row.status) {
    case "missing":
      return { variant: "destructive" as const, label: "Missing" };
    case "expired":
      return {
        variant: "destructive" as const,
        label: `Expired ${Math.abs(row.days_until_expiry ?? 0)} days ago`,
      };
    case "expiring_soon":
      return {
        variant: "secondary" as const,
        label: `Expires in ${row.days_until_expiry} days`,
      };
    case "valid":
      return { variant: "default" as const, label: "Valid" };
    case "no_expiry":
      return { variant: "outline" as const, label: "Submitted (no expiry)" };
  }
}

function overall(rows: RequiredCert[]): {
  tone: "green" | "amber" | "red" | "empty";
  label: string;
} {
  if (rows.length === 0) return { tone: "empty", label: "No requirements for your role" };
  if (rows.some((r) => r.status === "missing" || r.status === "expired"))
    return { tone: "red", label: "Action required" };
  if (rows.some((r) => r.status === "expiring_soon"))
    return { tone: "amber", label: "Renewals coming up" };
  return { tone: "green", label: "All current" };
}

const TONE_CLASS: Record<"green" | "amber" | "red" | "empty", string> = {
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  red: "bg-destructive/15 text-destructive border-destructive/30",
  empty: "bg-muted text-muted-foreground border-border",
};

export default function RequiredCertificationsCard({ userId, isOwnProfile, onUploadClick, refreshKey }: Props) {
  const { org } = useOrg();
  const [rows, setRows] = useState<RequiredCert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!org?.id || !userId) return;
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_user_cert_compliance", {
      _user_id: userId,
      _org_id: org.id,
    });
    if (error) {
      console.error(error);
    } else {
      setRows((data || []) as RequiredCert[]);
    }
    setLoading(false);
  }, [org?.id, userId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const summary = overall(rows);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Required Certifications
            </CardTitle>
            <CardDescription>
              Certifications required for your role under Ontario MOL / WSIB regulations.
            </CardDescription>
          </div>
          <Badge variant="outline" className={TONE_CLASS[summary.tone]}>
            {summary.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Your role currently has no required certifications configured.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const badge = statusBadge(r);
              const needsAction = r.status === "missing" || r.status === "expired" || r.status === "expiring_soon";
              return (
                <li
                  key={r.cert_type}
                  className="flex items-start justify-between gap-3 rounded-md border bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{r.cert_display_name}</p>
                    {r.regulatory_reference && (
                      <p className="text-xs text-muted-foreground">{r.regulatory_reference}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge variant={badge.variant} className="text-xs">
                        {badge.label}
                      </Badge>
                      {isOwnProfile && needsAction && (
                        <Button
                          size="sm"
                          variant={r.status === "expiring_soon" ? "outline" : "default"}
                          onClick={() =>
                            onUploadClick({
                              certType: r.cert_type,
                              displayName: r.cert_display_name,
                            })
                          }
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Upload Certificate
                        </Button>
                      )}
                      {isOwnProfile && r.status === "valid" && (
                        <button
                          className="text-xs text-primary underline-offset-2 hover:underline"
                          onClick={() =>
                            onUploadClick({
                              certType: r.cert_type,
                              displayName: r.cert_display_name,
                            })
                          }
                        >
                          Replace / renew
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
