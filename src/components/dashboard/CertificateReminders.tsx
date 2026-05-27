// TODO: surface required certs by role (WAH for painters, etc.) — see roadmap
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, AlertTriangle, Calendar, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, format } from "date-fns";
import { Link } from "react-router-dom";

interface ExpiringCert {
  id: string;
  name: string;
  expiry_date: string;
  daysLeft: number;
}

const CertificateReminders = () => {
  const { user } = useAuth();
  const [expiringCerts, setExpiringCerts] = useState<ExpiringCert[]>([]);
  const [totalCertCount, setTotalCertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCerts = async () => {
      if (!user) return;

      try {
        // Pull all certs so we can distinguish "none uploaded" from "all up to date"
        const { data } = await supabase
          .from("certificates")
          .select("id, name, expiry_date")
          .eq("user_id", user.id)
          .order("expiry_date", { ascending: true, nullsFirst: false });

        const all = data || [];
        setTotalCertCount(all.length);

        const now = new Date();
        const expiring = all
          .filter((cert) => cert.expiry_date)
          .map((cert) => ({
            ...cert,
            expiry_date: cert.expiry_date!,
            daysLeft: differenceInDays(new Date(cert.expiry_date!), now),
          }))
          .filter((cert) => cert.daysLeft <= 30);

        setExpiringCerts(expiring);
      } catch (error) {
        console.error("Error fetching certificates:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCerts();
  }, [user]);

  const getStatusColor = (daysLeft: number) => {
    if (daysLeft <= 0) return "destructive";
    if (daysLeft <= 14) return "destructive";
    return "secondary";
  };

  const getStatusText = (daysLeft: number) => {
    if (daysLeft <= 0) return "Expired";
    if (daysLeft === 1) return "1 day left";
    return `${daysLeft} days left`;
  };

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
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (expiringCerts.length === 0) {
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
            <span>All certificates are up to date!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-medium">
          <span className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Certificate Reminders
          </span>
          {expiringCerts.some((c) => c.daysLeft <= 14) && (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {expiringCerts.map((cert) => (
            <li key={cert.id}>
              <Link
                to="/profile"
                className="flex items-start justify-between gap-3 rounded-md p-2 -mx-2 hover:bg-muted transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{cert.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(cert.expiry_date), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusColor(cert.daysLeft)} className="shrink-0 text-xs">
                  {getStatusText(cert.daysLeft)}
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
