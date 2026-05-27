// TODO: surface required certs by role (WAH for painters, etc.) — see roadmap
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrganizationContext";
import { Link } from "react-router-dom";

interface ComplianceRow {
  cert_type: string;
  cert_display_name: string;
  status: "missing" | "expired" | "expiring_soon" | "valid" | "no_expiry";
  days_until_expiry: number | null;
}

const SHOW = new Set(["missing", "expired", "expiring_soon"]);

function rank(s: ComplianceRow["status"]) {
  if (s === "missing") return 0;
  if (s === "expired") return 1;
  return 2;
}

function label(r: ComplianceRow) {
  if (r.status === "missing") return "Missing";
  if (r.status === "expired") return `Expired ${Math.abs(r.days_until_expiry ?? 0)}d ago`;
  return `Expires in ${r.days_until_expiry}d`;
}

function variant(s: ComplianceRow["status"]) {
  return s === "expiring_soon" ? ("secondary" as const) : ("destructive" as const);
}

const CertificateReminders = () => {
  const { user } = useAuth();
  const { org } = useOrg();
  const [rows, setRows] = useState<ComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user || !org?.id) return;
      setLoading(true);
      const { data } = await (supabase as any).rpc("get_user_cert_compliance", {
        _user_id: user.id,
        _org_id: org.id,
      });
      const all = ((data || []) as ComplianceRow[]).filter((r) => SHOW.has(r.status));
      all.sort((a, b) => rank(a.status) - rank(b.status));
      setRows(all);
      setLoading(false);
    };
    void load();
  }, [user, org?.id]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Award className="h-4 w-4" />
            Certificate Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-10 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Award className="h-4 w-4" />
            Certificate Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>All required certifications are valid.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasUrgent = rows.some((r) => r.status === "missing" || r.status === "expired");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-medium">
          <span className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Certificate Reminders
          </span>
          {hasUrgent && <AlertTriangle className="h-4 w-4 text-destructive" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.cert_type}>
              <Link
                to="/profile"
                className="flex items-start justify-between gap-3 rounded-md p-2 -mx-2 hover:bg-muted transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.cert_display_name}</p>
                </div>
                <Badge variant={variant(r.status)} className="shrink-0 text-xs">
                  {label(r)}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default CertificateReminders;
