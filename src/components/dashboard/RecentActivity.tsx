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
        // Fetch recent SOP acknowledgments
        const { data: acks } = await supabase
          .from("sop_acks")
          .select("id, acknowledged_at, sop_id, sops(title)")
          .eq("user_id", user.id)
          .order("acknowledged_at", { ascending: false })
          .limit(5);

        // Fetch recent quiz passes
        const { data: quizzes } = await supabase
          .from("section_item_progress")
          .select("id, completed_at, item_key, section_key")
          .eq("user_id", user.id)
          .eq("completed", true)
          .order("completed_at", { ascending: false })
          .limit(5);

        // Fetch recent certificates
        const { data: certs } = await supabase
          .from("certificates")
          .select("id, created_at, name")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        const items: ActivityItem[] = [];

        acks?.forEach((ack) => {
          items.push({
            id: `ack-${ack.id}`,
            type: "sop_ack",
            title: (ack.sops as { title: string } | null)?.title || "SOP Acknowledged",
            timestamp: ack.acknowledged_at,
          });
        });

        quizzes?.forEach((q) => {
          items.push({
            id: `quiz-${q.id}`,
            type: "quiz_pass",
            title: q.item_key.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            timestamp: q.completed_at || "",
          });
        });

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
