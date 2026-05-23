import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

const OrgReackSettingsCard = () => {
  const { org, isOrgAdmin } = useOrganization();
  const [graceDays, setGraceDays] = useState(14);
  const [autoBlock, setAutoBlock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!org?.id) return;
    (async () => {
      const { data } = await supabase
        .from("orgs")
        .select("reack_grace_days, auto_block_uncompliant")
        .eq("id", org.id)
        .maybeSingle();
      if (data) {
        setGraceDays(data.reack_grace_days ?? 14);
        setAutoBlock(data.auto_block_uncompliant ?? false);
      }
      setLoading(false);
    })();
  }, [org?.id]);

  const save = async () => {
    if (!org?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("orgs")
      .update({ reack_grace_days: graceDays, auto_block_uncompliant: autoBlock })
      .eq("id", org.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  if (!isOrgAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Re-acknowledgement Policy</CardTitle>
        <CardDescription>
          When a document is updated, users have this many days to re-acknowledge (per POL-010 §4.4).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 max-w-xs">
          <Label htmlFor="grace">Grace period (days)</Label>
          <Input
            id="grace"
            type="number"
            min={1}
            max={90}
            value={graceDays}
            onChange={(e) => setGraceDays(parseInt(e.target.value || "14", 10))}
            disabled={loading}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="autoblock" className="font-medium">
              Auto-block uncompliant users from new assignments
            </Label>
            <p className="text-xs text-muted-foreground">
              Stricter enforcement — users with overdue re-acks won't receive new assignments.
            </p>
          </div>
          <Switch id="autoblock" checked={autoBlock} onCheckedChange={setAutoBlock} disabled={loading} />
        </div>
        <Button onClick={save} disabled={saving || loading}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default OrgReackSettingsCard;
