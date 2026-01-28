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
import { Loader2, Save, AlertTriangle, Trash2 } from "lucide-react";
import { useOrgSops } from "@/hooks/useOrgSops";
import { useToast } from "@/hooks/use-toast";

interface OrgSOPEditorProps {
  open: boolean;
  onClose: () => void;
  sopId: string;
  currentTitle: string;
  currentContent: string;
}

const COMPLIANCE_FOOTER = "\n\n---\n⚠️ This SOP has been customized by the company and may differ from system templates. The company is responsible for compliance.";

const OrgSOPEditor = ({ open, onClose, sopId, currentTitle, currentContent }: OrgSOPEditorProps) => {
  const { toast } = useToast();
  const { updateSop, deleteSop } = useOrgSops();
  
  const [title, setTitle] = useState(currentTitle);
  const [content, setContent] = useState(currentContent);
  const [changeSummary, setChangeSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
      // Remove footer when editing
      setContent(currentContent.replace(COMPLIANCE_FOOTER, ""));
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
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowSaveConfirm(false);
    setSaving(true);
    const contentWithFooter = content.trim() + COMPLIANCE_FOOTER;
    
    const { error } = await updateSop(sopId, {
      title: title.trim(),
      content_md: contentWithFooter,
      last_change_summary: changeSummary.trim() || null,
    });
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: error.message,
      });
    } else {
      toast({
        title: "SOP updated",
        description: "Changes saved. Acknowledgments may be reset if content changed.",
      });
      onClose();
    }
    setSaving(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    
    const { error } = await deleteSop(sopId);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to delete",
        description: error.message,
      });
    } else {
      toast({
        title: "SOP deleted",
        description: "The SOP has been permanently removed.",
      });
      onClose();
    }
    setDeleting(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Organization SOP</DialogTitle>
            <DialogDescription>
              Update this SOP. If content changes, existing acknowledgments will be reset.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                You are responsible for ensuring this content complies with applicable laws.
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
              <Label htmlFor="change-summary">Change Summary (optional)</Label>
              <Input
                id="change-summary"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Brief description of changes..."
              />
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Auto-appended compliance notice:</p>
              <p className="italic">
                "This SOP has been customized by the company and may differ from system templates."
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive" 
              onClick={handleDeleteClick} 
              disabled={saving || deleting}
              className="sm:mr-auto"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete SOP
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={saving || deleting}>
              Cancel
            </Button>
            <Button onClick={handleSaveClick} disabled={saving || deleting}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Saving changes to this SOP will reset all employee acknowledgments. 
              Employees will need to re-acknowledge the updated content.
              <br /><br />
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Yes, Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SOP Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the SOP 
              "{currentTitle}" and remove all associated acknowledgment records.
              <br /><br />
              <span className="font-semibold text-destructive">
                Are you absolutely sure?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrgSOPEditor;
