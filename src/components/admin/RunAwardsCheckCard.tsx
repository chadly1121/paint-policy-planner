import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function RunAwardsCheckCard() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{ processed: number; errors: number; grantedUsers: number } | null>(null);

  const handleRun = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("grant-awards", {
        body: { triggered_by: "admin_manual" },
      });
      if (error) throw error;
      const grants = (data?.grants ?? {}) as Record<string, string[]>;
      const grantedUsers = Object.keys(grants).length;
      setLastResult({
        processed: data?.processed ?? 0,
        errors: data?.errors ?? 0,
        grantedUsers,
      });
      toast({
        title: "Awards check complete",
        description: `Evaluated ${data?.processed ?? 0} members, granted awards to ${grantedUsers} user(s).`,
      });
    } catch (e: any) {
      toast({
        title: "Awards check failed",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Achievement Awards
        </CardTitle>
        <CardDescription>
          Awards are evaluated automatically every day at 03:00 UTC. Use this button for one-off catch-ups or to test changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={handleRun} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trophy className="h-4 w-4 mr-2" />}
          Run awards check now
        </Button>
        {lastResult && (
          <p className="text-sm text-muted-foreground">
            Last run: {lastResult.processed} member(s) evaluated, {lastResult.grantedUsers} user(s) newly awarded
            {lastResult.errors > 0 ? `, ${lastResult.errors} error(s)` : ""}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
