// AI Settings Card for Admin panel - manages per-org OpenAI connection
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Bot, 
  Key, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Trash2,
  ExternalLink,
  BarChart3,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AISettings {
  id: string;
  provider: string;
  api_key_hint: string;
  is_active: boolean;
  connected_at: string;
  last_test_at: string | null;
  last_test_success: boolean | null;
  last_used_at: string | null;
  requests_this_month: number;
}

export function AISettingsCard() {
  const { toast } = useToast();
  const { org } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (org?.id) {
      fetchAISettings();
    }
  }, [org?.id]);

  const fetchAISettings = async () => {
    if (!org?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("org_ai_settings")
        .select("*")
        .eq("org_id", org.id)
        .eq("provider", "openai")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      setAiSettings(data || null);
    } catch (error) {
      console.error("Error fetching AI settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast({
        variant: "destructive",
        title: "API key required",
        description: "Please enter your OpenAI API key.",
      });
      return;
    }

    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("ai-connect", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { apiKey, provider: "openai" },
      });

      if (response.error) throw response.error;

      if (response.data?.error) {
        toast({
          variant: "destructive",
          title: "Connection failed",
          description: response.data.error,
        });
        return;
      }

      toast({
        title: "AI Provider Connected",
        description: "Your OpenAI API key has been securely stored.",
      });

      setApiKey("");
      await fetchAISettings();
    } catch (error) {
      console.error("AI connect error:", error);
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("ai-test", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;

      if (response.data?.success) {
        toast({
          title: "Connection Successful",
          description: "Your OpenAI API key is working correctly.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: response.data?.error || "API key test failed.",
        });
      }

      await fetchAISettings();
    } catch (error) {
      console.error("AI test error:", error);
      toast({
        variant: "destructive",
        title: "Test failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("ai-revoke", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;

      toast({
        title: "AI Provider Disconnected",
        description: "Your API key has been removed.",
      });

      setAiSettings(null);
    } catch (error) {
      console.error("AI revoke error:", error);
      toast({
        variant: "destructive",
        title: "Failed to disconnect",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Settings
        </CardTitle>
        <CardDescription>
          Connect your OpenAI API key to enable the SOP Assistant for your organization.
          AI usage and costs are your organization's responsibility.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!aiSettings ? (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>AI Provider Required</AlertTitle>
              <AlertDescription>
                Connect your OpenAI API key to enable the SOP Assistant. Your employees will be able 
                to ask questions about your organization's documents.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">OpenAI API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get your API key from{" "}
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    OpenAI Platform
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              <Button onClick={handleConnect} disabled={connecting || !apiKey.trim()}>
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Connect API Key
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  aiSettings.last_test_success ? "bg-green-100 dark:bg-green-900/30" : "bg-yellow-100 dark:bg-yellow-900/30"
                }`}>
                  {aiSettings.last_test_success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">OpenAI</span>
                    <Badge variant={aiSettings.is_active ? "default" : "secondary"}>
                      {aiSettings.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    API Key: ****{aiSettings.api_key_hint}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Connected:</span>
                <p className="font-medium">
                  {new Date(aiSettings.connected_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Used:</span>
                <p className="font-medium">
                  {aiSettings.last_used_at 
                    ? new Date(aiSettings.last_used_at).toLocaleDateString()
                    : "Never"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Test:</span>
                <p className="font-medium flex items-center gap-1">
                  {aiSettings.last_test_at ? (
                    <>
                      {aiSettings.last_test_success ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-destructive" />
                      )}
                      {new Date(aiSettings.last_test_at).toLocaleDateString()}
                    </>
                  ) : (
                    "Never"
                  )}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Requests This Month:</span>
                <p className="font-medium flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {aiSettings.requests_this_month || 0}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleTest} disabled={testing}>
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect AI Provider?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove your OpenAI API key and disable the SOP Assistant 
                      for all employees in your organization.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleRevoke}
                      disabled={revoking}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {revoking ? "Disconnecting..." : "Disconnect"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Rotate API Key</h4>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="New API key (sk-...)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleConnect} disabled={connecting || !apiKey.trim()}>
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Update Key"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
