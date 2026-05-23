import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface UserRow {
  user_id: string;
  full_name: string;
  email: string;
  pending: number;
  overdue: number;
  oldestDeadline: string | null;
}

type SortKey = "overdue" | "pending" | "oldest";

const ReackStatusCard = () => {
  const { org } = useOrganization();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("overdue");

  useEffect(() => {
    if (!org?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("doc_reack_required")
        .select("user_id, reack_deadline")
        .eq("org_id", org.id)
        .is("completed_at", null);

      const now = new Date();
      const grouped = new Map<string, { pending: number; overdue: number; oldest: string }>();
      for (const r of data ?? []) {
        const g = grouped.get(r.user_id) ?? { pending: 0, overdue: 0, oldest: r.reack_deadline };
        g.pending += 1;
        if (new Date(r.reack_deadline) < now) g.overdue += 1;
        if (new Date(r.reack_deadline) < new Date(g.oldest)) g.oldest = r.reack_deadline;
        grouped.set(r.user_id, g);
      }

      const userIds = Array.from(grouped.keys());
      if (userIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      const merged: UserRow[] = userIds.map((id) => ({
        user_id: id,
        full_name: profMap.get(id)?.full_name ?? "Unknown",
        email: profMap.get(id)?.email ?? "",
        pending: grouped.get(id)!.pending,
        overdue: grouped.get(id)!.overdue,
        oldestDeadline: grouped.get(id)!.oldest,
      }));
      setRows(merged);
      setLoading(false);
    })();
  }, [org?.id]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    if (sort === "overdue") arr.sort((a, b) => b.overdue - a.overdue);
    if (sort === "pending") arr.sort((a, b) => b.pending - a.pending);
    if (sort === "oldest")
      arr.sort((a, b) => new Date(a.oldestDeadline ?? 0).getTime() - new Date(b.oldestDeadline ?? 0).getTime());
    return arr;
  }, [rows, sort]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Re-acknowledgement Status</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everyone is caught up. 🎉</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => setSort("pending")}>
                    Pending <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => setSort("overdue")}>
                    Overdue <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => setSort("oldest")}>
                    Oldest deadline <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.user_id}>
                  <TableCell>
                    <div className="font-medium">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell>{r.pending}</TableCell>
                  <TableCell>
                    {r.overdue > 0 ? (
                      <Badge variant="destructive">{r.overdue}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.oldestDeadline ? new Date(r.oldestDeadline).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ReackStatusCard;
