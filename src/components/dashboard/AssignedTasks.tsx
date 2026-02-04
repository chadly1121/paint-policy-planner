import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface PendingItem {
  id: string;
  title: string;
  type: "sop" | "quiz";
  urgent?: boolean;
}

const AssignedTasks = () => {
  const { user } = useAuth();
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      if (!user) return;

      try {
        // Fetch assigned SOPs that need acknowledgment
        const { data: assignedSops } = await supabase.rpc("get_user_assigned_sops", {
          _user_id: user.id,
        });

        const items: PendingItem[] = [];

        // Add unacknowledged SOPs - only show org SOPs (Drive-backed), not system templates
        assignedSops
          ?.filter((sop) => !sop.is_acknowledged && sop.ack_required && sop.source === "org")
          .forEach((sop) => {
            items.push({
              id: sop.sop_id,
              title: sop.title,
              type: "sop",
              urgent: false,
            });
          });

        setPendingItems(items.slice(0, 5));
      } catch (error) {
        console.error("Error fetching pending items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPending();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <ClipboardList className="h-4 w-4" />
            Assigned Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingItems.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <ClipboardList className="h-4 w-4" />
            Assigned Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>All caught up! No pending tasks.</span>
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
            <ClipboardList className="h-4 w-4" />
            Assigned Tasks
          </span>
          <Badge variant="secondary" className="text-xs">
            {pendingItems.length} pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {pendingItems.map((item) => (
            <li key={item.id}>
              <Link
                to="/sops"
                className="flex items-start gap-3 rounded-md p-2 -mx-2 hover:bg-muted transition-colors"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">Requires acknowledgment</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default AssignedTasks;
