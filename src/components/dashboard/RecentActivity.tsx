import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, FileText, CheckCircle2, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "sop_ack" | "quiz_pass" | "cert_added";
  title: string;
  timestamp: string;
}

const RecentActivity = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
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

        // Fetch recent SOP acknowledgments
        const { data: acks } = await supabase
          .from("sop_acks")
          .select("id, acknowledged_at, sop_id, sops(title, source, drive_file_id)")
          .eq("user_id", user.id)
          .order("acknowledged_at", { ascending: false })
          .limit(10);

        // Fetch recent quiz passes
        const { data: quizzes } = await supabase
          .from("section_item_progress")
          .select("id, completed_at, item_key, section_key")
          .eq("user_id", user.id)
          .eq("completed", true)
          .order("completed_at", { ascending: false })
          .limit(10);

        // Fetch recent certificates
        const { data: certs } = await supabase
          .from("certificates")
          .select("id, created_at, name")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        const items: ActivityItem[] = [];

        // Only show org SOPs that exist in Drive
        acks
          ?.filter((ack) => {
            const sop = ack.sops as { title: string; source: string; drive_file_id: string | null } | null;
            // Must be org SOP AND have a drive_file_id that exists in actual Drive
            return sop?.source === "org" && sop?.drive_file_id && actualDriveFileIds.has(sop.drive_file_id);
          })
          .forEach((ack) => {
            items.push({
              id: `ack-${ack.id}`,
              type: "sop_ack",
              title: (ack.sops as { title: string } | null)?.title || "SOP Acknowledged",
              timestamp: ack.acknowledged_at,
            });
          });

        // For quiz passes, only show those for SOPs that exist in Drive
        if (quizzes && quizzes.length > 0 && actualDriveFileIds.size > 0) {
          // Get all SOPs that have drive_file_ids in our actual Drive files
          const { data: driveSops } = await supabase
            .from("sops")
            .select("id, title, drive_file_id")
            .not("drive_file_id", "is", null);

          // Filter to only SOPs whose drive_file_id exists in actual Drive
          const validDriveSops = (driveSops || []).filter(
            (s) => s.drive_file_id && actualDriveFileIds.has(s.drive_file_id)
          );
          
          const validSopIds = new Set(validDriveSops.map((s) => s.id));
          const validDriveFileIds = new Set(validDriveSops.map((s) => s.drive_file_id));

          quizzes.forEach((q) => {
            // Check if item_key matches a valid SOP id or drive_file_id
            const matchingSop = validDriveSops.find(
              (s) => s.id === q.item_key || s.drive_file_id === q.item_key
            );
            
            if (matchingSop) {
              items.push({
                id: `quiz-${q.id}`,
                type: "quiz_pass",
                title: matchingSop.title,
                timestamp: q.completed_at || "",
              });
            }
          });
        }

        certs?.forEach((c) => {
          items.push({
            id: `cert-${c.id}`,
            type: "cert_added",
            title: c.name,
            timestamp: c.created_at,
          });
        });

        // Sort by timestamp and take top 5
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setActivities(items.slice(0, 5));
      } catch (error) {
        console.error("Error fetching activity:", error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [user]);

  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "sop_ack":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "quiz_pass":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "cert_added":
        return <Award className="h-4 w-4 text-amber-500" />;
    }
  };

  const getLabel = (type: ActivityItem["type"]) => {
    switch (type) {
      case "sop_ack":
        return "Acknowledged";
      case "quiz_pass":
        return "Quiz passed";
      case "cert_added":
        return "Certificate added";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Clock className="h-4 w-4" />
            Recent Activity
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

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Clock className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent activity yet. Start by viewing SOPs and taking quizzes!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Clock className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {activities.map((activity) => (
            <li key={activity.id} className="flex items-start gap-3">
              <div className="mt-0.5">{getIcon(activity.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.title}</p>
                <p className="text-xs text-muted-foreground">
                  {getLabel(activity.type)} •{" "}
                  {activity.timestamp
                    ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
                    : "Recently"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
