import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PendingReack {
  id: string;
  sop_id: string;
  reack_deadline: string;
  title?: string;
}

const PendingReacksCard = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<PendingReack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("doc_reack_required")
        .select("id, sop_id, reack_deadline")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .order("reack_deadline", { ascending: true });

      const rows = (data ?? []) as PendingReack[];
      if (rows.length > 0) {
        const ids = Array.from(new Set(rows.map((r) => r.sop_id)));
        const { data: sops } = await supabase.from("sops").select("id, title").in("id", ids);
        const map = new Map((sops ?? []).map((s: any) => [s.id, s.title]));
        rows.forEach((r) => (r.title = map.get(r.sop_id) ?? "Document"));
      }
      setItems(rows);
      setLoading(false);
    })();
  }, [user]);

  if (loading || items.length === 0) return null;

  const mostUrgent = items[0];
  const isOverdue = new Date(mostUrgent.reack_deadline) < new Date();
  const deadline = new Date(mostUrgent.reack_deadline).toLocaleDateString();

  return (
    <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-transparent dark:from-amber-950/20">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
            <AlertTriangle className="h-6 w-6 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {items.length} pending re-acknowledgement{items.length === 1 ? "" : "s"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Most urgent: <span className="font-medium">{mostUrgent.title}</span> · deadline {deadline}{" "}
              {isOverdue && (
                <Badge variant="destructive" className="ml-1 align-middle">
                  Overdue
                </Badge>
              )}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to="/sops">
            Start re-acknowledging
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default PendingReacksCard;
