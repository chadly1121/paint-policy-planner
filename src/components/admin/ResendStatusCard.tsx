import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertTriangle, Loader2, Mail } from "lucide-react";

export function ResendStatusCard() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-resend-status");
        if (error) throw error;
        setConfigured(!!(data as any)?.resend_configured);
      } catch {
        setConfigured(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          Email Notifications (Resend)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />Checking…
          </div>
        ) : configured ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>Configured — admins will receive incident emails.</span>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
            <div>
              <p className="font-medium">RESEND_API_KEY not configured.</p>
              <p className="text-muted-foreground">
                Severe / critical incident reports will save without notifying admins by email.{" "}
                <a href="https://resend.com/docs/dashboard/api-keys/introduction"
                  target="_blank" rel="noopener noreferrer" className="underline">
                  Set up Resend
                </a>
                .
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
