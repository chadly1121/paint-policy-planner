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
      description: "You can now customize SOPs and policies.",
    });
    onAccepted();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Content Editing Disclaimer
          </DialogTitle>
          <DialogDescription>
            Please read and accept before enabling custom content editing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Important Legal Notice</strong>
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground space-y-3">
            <p>
              By enabling custom content editing, you acknowledge and agree that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong>You are creating company-specific policies.</strong> This application 
                provides templates and structure, not legal advice.
              </li>
              <li>
                <strong>You are responsible for compliance.</strong> All customized SOPs and 
                policies must be reviewed by your legal and compliance teams.
              </li>
              <li>
                <strong>The app does not ensure legal correctness.</strong> We provide tools 
                to help you document and enforce procedures, but cannot guarantee they meet 
                your jurisdiction's requirements.
              </li>
              <li>
                <strong>Your edits are your responsibility.</strong> Modified content is 
                tracked as company-owned and marked distinctly from system templates.
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
              I understand and accept full responsibility for reviewing and approving 
              any customized content for legal compliance. I acknowledge that this 
              application does not provide legal advice.
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
            Accept & Enable Editing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DisclaimerModal;
