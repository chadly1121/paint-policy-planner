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
  const [completedAckCount, setCompletedAckCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      if (!user) return;

      try {
        // First, get the actual files in Drive to know what truly exists
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const driveResponse = await supabase.functions.invoke("drive-list-files", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: { folder_type: "sops" },
        });

        // Get set of actual Drive file IDs (excluding templates)
        const actualDriveFileIds = new Set<string>(
          (driveResponse.data?.files || [])
            .filter((f: { name: string }) => !f.name.startsWith("_TEMPLATE"))
            .map((f: { id: string }) => f.id)
        );

        // Count total completed acknowledgments for empty-state branching
        const { count: ackCount } = await supabase
          .from("sop_acks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        setCompletedAckCount(ackCount ?? 0);

        if (actualDriveFileIds.size === 0) {
          setPendingItems([]);
          setLoading(false);
          return;
        }

        // Fetch assigned SOPs that need acknowledgment
        const { data: assignedSops } = await supabase.rpc("get_user_assigned_sops", {
          _user_id: user.id,
        });

        // Filter for org SOPs that need acknowledgment AND exist in Drive
        const items: PendingItem[] = [];

        assignedSops?.forEach((sop) => {
          // Only show if: not acknowledged, requires ack, is org SOP, and exists in Drive
          if (!sop.is_acknowledged && sop.ack_required && sop.source === "org") {
            // Get the drive_file_id for this SOP from the database
            // Since we don't have it in the RPC result, we need to check the sops table
            // But we can match by checking if any of our actual Drive files correspond to this SOP
            items.push({
              id: sop.sop_id,
              title: sop.title,
              type: "sop",
              urgent: false,
            });
          }
        });

        // Now verify which of these SOPs actually have drive_file_ids that exist in Drive
        if (items.length > 0) {
          const sopIds = items.map((item) => item.id);
          const { data: sopsWithDrive } = await supabase
            .from("sops")
            .select("id, drive_file_id")
            .in("id", sopIds)
            .not("drive_file_id", "is", null);

          // Filter to only include SOPs whose drive_file_id is in our actual Drive files
          const validSopIds = new Set(
            (sopsWithDrive || [])
              .filter((s) => s.drive_file_id && actualDriveFileIds.has(s.drive_file_id))
              .map((s) => s.id)
          );

          const validItems = items.filter((item) => validSopIds.has(item.id));
          setPendingItems(validItems.slice(0, 5));
        } else {
          setPendingItems([]);
        }
      } catch (error) {
        console.error("Error fetching pending items:", error);
        setPendingItems([]);
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
    const hasAnyCompletion = completedAckCount > 0;
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <ClipboardList className="h-4 w-4" />
            Assigned Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasAnyCompletion ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>All caught up! No pending tasks.</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tasks assigned yet.{" "}
              <Link to="/policies" className="text-primary underline-offset-2 hover:underline">
                Browse Company Policies
              </Link>{" "}
              to get started.
            </p>
          )}
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
