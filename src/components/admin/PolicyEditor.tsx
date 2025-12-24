import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw, AlertTriangle, Shield, Pencil } from "lucide-react";
import { useCompanyContent } from "@/hooks/useCompanyContent";
import { useToast } from "@/hooks/use-toast";

interface PolicyEditorProps {
  open: boolean;
  onClose: () => void;
  policyKey: string;
  systemTitle: string;
  systemContent: string;
}

const COMPLIANCE_FOOTER = "\n\n---\n⚠️ This policy has been customized by the company and may differ from system templates. The company is responsible for compliance.";

const PolicyEditor = ({ open, onClose, policyKey, systemTitle, systemContent }: PolicyEditorProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { getCompanyPolicy, upsertCompanyPolicy, resetPolicyToSystem } = useCompanyContent();
  
  const [title, setTitle] = useState(systemTitle);
  const [content, setContent] = useState(systemContent);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const companyPolicy = getCompanyPolicy(policyKey);
  const isCustomized = !!companyPolicy;

  useEffect(() => {
    if (open) {
      if (companyPolicy) {
        setTitle(companyPolicy.title);
        setContent(companyPolicy.content.replace(COMPLIANCE_FOOTER, ""));
      } else {
        setTitle(systemTitle);
        setContent(systemContent);
      }
    }
  }, [open, companyPolicy, systemTitle, systemContent]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Title and content are required.",
      });
      return;
    }

    setSaving(true);
    const contentWithFooter = content.trim() + COMPLIANCE_FOOTER;
    const { error } = await upsertCompanyPolicy(policyKey, title.trim(), contentWithFooter);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: "Please try again.",
      });
    } else {
      toast({
        title: "Policy saved",
        description: "Your custom policy has been saved successfully.",
      });
      onClose();
    }
    setSaving(false);
  };

  const handleReset = async () => {
    setResetting(true);
    const { error } = await resetPolicyToSystem(policyKey);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to reset",
        description: "Please try again.",
      });
    } else {
      toast({
        title: "Reset to system default",
        description: "The policy has been reset to the original template.",
      });
      setTitle(systemTitle);
      setContent(systemContent);
      onClose();
    }
    setResetting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCustomized ? (
              <>
                <Pencil className="h-5 w-5 text-primary" />
                Edit Custom Policy
                <Badge variant="secondary" className="ml-2">✏️ Custom</Badge>
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 text-muted-foreground" />
                Customize Policy
                <Badge variant="outline" className="ml-2">🛡️ System</Badge>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isCustomized 
              ? "Editing your company's customized version. Original template is preserved."
              : "Create a custom version of this policy. The system template will remain unchanged."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
              You are responsible for ensuring this content complies with applicable laws in your jurisdiction.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="policy-title">Title</Label>
            <Input
              id="policy-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Policy Title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="policy-content">Content</Label>
            <Textarea
              id="policy-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Policy content..."
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Use bullet points (•) and numbered lists for better formatting.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Auto-appended compliance notice:</p>
            <p className="italic">
              "This policy has been customized by the company and may differ from system templates. 
              The company is responsible for compliance."
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isCustomized && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={resetting || saving}
              className="sm:mr-auto"
            >
              {resetting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reset to System Default
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={saving || resetting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || resetting}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Custom Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PolicyEditor;
