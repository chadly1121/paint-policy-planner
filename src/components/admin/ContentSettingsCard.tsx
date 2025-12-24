import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Settings, AlertTriangle, FileEdit, Loader2, CheckCircle } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useDisclaimerAcceptance } from "@/hooks/useDisclaimerAcceptance";
import { useToast } from "@/hooks/use-toast";
import DisclaimerModal from "@/components/admin/DisclaimerModal";
import { format } from "date-fns";

const ContentSettingsCard = () => {
  const { settings, loading, updateSettings, enableCustomSOPs, enableCustomPolicies } = useCompanySettings();
  const { hasAccepted, acceptance, loading: disclaimerLoading } = useDisclaimerAcceptance();
  const { toast } = useToast();
  const [updating, setUpdating] = useState<string | null>(null);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<{ field: 'enable_custom_sops' | 'enable_custom_policies'; value: boolean } | null>(null);

  const handleToggle = async (field: 'enable_custom_sops' | 'enable_custom_policies', value: boolean) => {
    // If enabling and disclaimer not accepted, show modal first
    if (value && !hasAccepted) {
      setPendingToggle({ field, value });
      setShowDisclaimerModal(true);
      return;
    }

    await performToggle(field, value);
  };

  const performToggle = async (field: 'enable_custom_sops' | 'enable_custom_policies', value: boolean) => {
    setUpdating(field);
    const { error } = await updateSettings({ [field]: value });
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to update setting",
        description: "Please try again.",
      });
    } else {
      toast({
        title: value ? "Custom editing enabled" : "Custom editing disabled",
        description: value 
          ? "You can now customize system content. Original templates remain unchanged."
          : "Content will now show system defaults.",
      });
    }
    setUpdating(null);
  };

  const handleDisclaimerAccepted = async () => {
    setShowDisclaimerModal(false);
    if (pendingToggle) {
      await performToggle(pendingToggle.field, pendingToggle.value);
      setPendingToggle(null);
    }
  };

  if (loading || disclaimerLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <DisclaimerModal
        open={showDisclaimerModal}
        onClose={() => {
          setShowDisclaimerModal(false);
          setPendingToggle(null);
        }}
        onAccepted={handleDisclaimerAccepted}
      />
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Content Management
          <Badge variant="outline" className="ml-2">Admin</Badge>
        </CardTitle>
        <CardDescription>
          Enable custom editing of SOPs and policies. System templates remain intact as backups.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasAccepted && acceptance && (
          <Alert className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Disclaimer accepted on {format(new Date(acceptance.accepted_at), "MMMM d, yyyy 'at' h:mm a")}
            </AlertDescription>
          </Alert>
        )}
        
        <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Editing system content makes it company-specific. <strong>You are responsible for ensuring legal compliance.</strong>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="custom-sops" className="flex items-center gap-2 text-base font-medium">
                <FileEdit className="h-4 w-4" />
                Enable Custom Editing of SOPs
              </Label>
              <p className="text-sm text-muted-foreground">
                Fork and customize Standard Operating Procedures for your company
              </p>
            </div>
            <Switch
              id="custom-sops"
              checked={enableCustomSOPs}
              onCheckedChange={(checked) => handleToggle('enable_custom_sops', checked)}
              disabled={updating === 'enable_custom_sops'}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="custom-policies" className="flex items-center gap-2 text-base font-medium">
                <FileEdit className="h-4 w-4" />
                Enable Custom Editing of Policies
              </Label>
              <p className="text-sm text-muted-foreground">
                Fork and customize Company Policies for your company
              </p>
            </div>
            <Switch
              id="custom-policies"
              checked={enableCustomPolicies}
              onCheckedChange={(checked) => handleToggle('enable_custom_policies', checked)}
              disabled={updating === 'enable_custom_policies'}
            />
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>System templates (🛡️) are read-only and always recoverable</li>
            <li>Custom content (✏️) is your company's edited version</li>
            <li>You can reset any custom content back to system default</li>
            <li>All edits include a non-removable compliance disclaimer</li>
            <li>Version numbers auto-increment on edits, resetting acknowledgments</li>
          </ul>
        </div>
      </CardContent>
    </Card>
    </>
  );
};

export default ContentSettingsCard;
