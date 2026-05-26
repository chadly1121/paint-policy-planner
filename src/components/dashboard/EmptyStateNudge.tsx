import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface EmptyStateNudgeProps {
  completedCount: number;
  availablePoints: number;
}

const DISMISS_KEY = "dashboard.emptyStateNudge.dismissedAt";

const EmptyStateNudge = ({ completedCount, availablePoints }: EmptyStateNudgeProps) => {
  const { user, session } = useAuth();
  const [hasActivity, setHasActivity] = useState<boolean | null>(null);
  const [hasPendingReacks, setHasPendingReacks] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!window.localStorage.getItem(DISMISS_KEY);
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [acks, certs, progress, reacks] = await Promise.all([
        supabase.from("sop_acks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("certificates").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("section_item_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("completed", true),
        supabase
          .from("doc_reack_required")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("completed_at", null),
      ]);
      if (cancelled) return;
      const activity = (acks.count ?? 0) + (certs.count ?? 0) + (progress.count ?? 0) > 0;
      setHasActivity(activity);
      setHasPendingReacks((reacks.count ?? 0) > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (dismissed) return null;
  if (completedCount > 0 || availablePoints > 0) return null;
  if (hasActivity === null || hasPendingReacks === null) return null;
  if (hasActivity || hasPendingReacks) return null;

  const fullName =
    (session?.user.user_metadata as { full_name?: string } | undefined)?.full_name ||
    session?.user.email ||
    "";
  const firstName = (fullName.split(" ")[0] || fullName.split("@")[0] || "there").trim();

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    }
    setDismissed(true);
  };

  return (
    <Card className="relative border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Welcome aboard, {firstName}!
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You haven't started any training yet. Begin with Company Policies — they cover the
              basics every team member needs to know.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Button asChild>
            <Link to="/policies">
              Start with Company Policies
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
            <Link to="/sops">Browse all sections</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmptyStateNudge;
