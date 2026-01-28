import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, AlertTriangle, Copy } from "lucide-react";
import { useOrgSops } from "@/hooks/useOrgSops";
import { useToast } from "@/hooks/use-toast";

interface SystemSOPEditorProps {
  open: boolean;
  onClose: () => void;
  sopId: string;
  systemKey: string | null;
  currentTitle: string;
  currentContent: string;
}

const COMPLIANCE_FOOTER = "\n\n---\n⚠️ This content has been imported and customized by the organization. The organization is responsible for ensuring compliance with applicable laws and regulations.";

const SystemSOPEditor = ({ 
  open, 
  onClose, 
  sopId, 
  systemKey,
  currentTitle, 
  currentContent 
}: SystemSOPEditorProps) => {
  const { toast } = useToast();
  const { forkSystemSop } = useOrgSops();
  
  const [title, setTitle] = useState(currentTitle);
  const [content, setContent] = useState(currentContent);
  const [changeSummary, setChangeSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [showLiabilityWarning, setShowLiabilityWarning] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
      setContent(currentContent);
      setChangeSummary("");
    }
  }, [open, currentTitle, currentContent]);

  const handleSaveClick = () => {
    if (!title.trim() || !content.trim()) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Title and content are required.",
      });
      return;
    }
    // Show liability warning before forking
    setShowLiabilityWarning(true);
  };

  const handleConfirmFork = async () => {
    setShowLiabilityWarning(false);
    setSaving(true);
    
    const contentWithFooter = content.trim() + COMPLIANCE_FOOTER;
    
    if (!systemKey) {
      toast({
        variant: "destructive",
        title: "Cannot edit",
        description: "This SOP does not have a system key.",
      });
      setSaving(false);
      return;
    }

    const { error } = await forkSystemSop(
      systemKey,
      title.trim(),
      contentWithFooter
    );
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to create custom version",
        description: error.message,
      });
    } else {
      toast({
        title: "Custom SOP created",
        description: "A customized copy has been created for your organization. You can now edit it freely.",
      });
      onClose();
    }
    setSaving(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Customize System SOP
            </DialogTitle>
            <DialogDescription>
              Create a customized version of this system SOP for your organization.
              The original system template will remain unchanged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                <strong>Liability Notice:</strong> By customizing this SOP, your organization 
                assumes full responsibility for its content and compliance with applicable laws 
                and regulations. This customized version will replace the system template for 
                your organization.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="sop-title">Title</Label>
              <Input
                id="sop-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="SOP Title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sop-content">Content</Label>
              <Textarea
                id="sop-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="SOP content..."
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="change-summary">Reason for Customization (optional)</Label>
              <Input
                id="change-summary"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Brief description of customizations..."
              />
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Auto-appended compliance notice:</p>
              <p className="italic">
                "This content has been imported and customized by the organization. 
                The organization is responsible for ensuring compliance."
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveClick} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Create Custom Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Liability Warning Dialog */}
      <AlertDialog open={showLiabilityWarning} onOpenChange={setShowLiabilityWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Liability Acknowledgment Required
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to create a <strong>customized version</strong> of a system SOP. 
                By proceeding, you acknowledge and agree that:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your organization assumes full responsibility for this content</li>
                <li>This application does not guarantee legal compliance</li>
                <li>You are responsible for reviewing and approving all customizations</li>
                <li>The customized SOP will be displayed to employees instead of the system template</li>
              </ul>
              <p className="font-medium pt-2">
                Do you accept responsibility and wish to proceed?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmFork}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              I Accept, Create Custom Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SystemSOPEditor;
