import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, Loader2 } from "lucide-react";
import { useDisclaimerAcceptance } from "@/hooks/useDisclaimerAcceptance";
import { useToast } from "@/hooks/use-toast";

interface DisclaimerModalProps {
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
}

const DisclaimerModal = ({ open, onClose, onAccepted }: DisclaimerModalProps) => {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const { acceptDisclaimer, currentVersion } = useDisclaimerAcceptance();
  const { toast } = useToast();

  const handleAccept = async () => {
    if (!agreed) return;
    
    setSaving(true);
    const { error } = await acceptDisclaimer();
    setSaving(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to save acceptance",
        description: "Please try again.",
      });
      return;
    }

    toast({
      title: "Disclaimer accepted",
      description: "You can now create and manage documents.",
    });
    onAccepted();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Document Management Disclaimer
          </DialogTitle>
          <DialogDescription>
            Please read and accept before creating or editing documents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Important Notice</strong>
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground space-y-3">
            <p>
              By creating or managing documents in SOPed.ai, you acknowledge and agree that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong>You control the content.</strong> All SOPs, policies, and training 
                materials are created and stored in your Google Drive. SOPed.ai provides 
                structure and tracking—not the content itself.
              </li>
              <li>
                <strong>You are responsible for accuracy.</strong> Ensure your documents 
                are accurate, complete, and appropriate for your organization's needs.
              </li>
              <li>
                <strong>AI quizzes require review.</strong> Quiz questions are generated 
                by AI based on your documents. Review them for accuracy before employees 
                take them.
              </li>
              <li>
                <strong>Compliance is your responsibility.</strong> SOPed.ai does not 
                verify legal compliance. Consult professionals for legal, HR, and safety 
                requirements in your jurisdiction.
              </li>
              <li>
                <strong>Acknowledgments are tracked.</strong> When employees acknowledge 
                documents, timestamps and metadata are recorded for audit purposes.
              </li>
            </ul>
          </div>

          <div className="flex items-start gap-3 pt-4 border-t">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
            />
            <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
              I understand that I am responsible for creating accurate documents, reviewing 
              AI-generated quizzes, and ensuring compliance with applicable laws. SOPed.ai 
              provides tools—not legal advice.
            </Label>
          </div>

          <p className="text-xs text-muted-foreground">
            Disclaimer version: {currentVersion}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={!agreed || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DisclaimerModal;
