import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddCertificateDialogProps {
  onAdd: (certificate: {
    name: string;
    issuing_authority?: string;
    certificate_url?: string;
    issue_date?: string;
    expiry_date?: string;
  }) => Promise<{ error: Error | null }>;
  onUpload: (file: File) => Promise<{ url: string | null; error: Error | null }>;
}

const AddCertificateDialog = ({ onAdd, onUpload }: AddCertificateDialogProps) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [certificateUrl, setCertificateUrl] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const resetForm = () => {
    setName("");
    setIssuingAuthority("");
    setCertificateUrl("");
    setIssueDate("");
    setExpiryDate("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select a file smaller than 10MB",
      });
      return;
    }

    setUploading(true);
    const { url, error } = await onUpload(file);
    setUploading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } else if (url) {
      setCertificateUrl(url);
      toast({
        title: "File uploaded",
        description: "Certificate file uploaded successfully",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Certificate name is required",
      });
      return;
    }

    setSaving(true);
    const { error } = await onAdd({
      name: name.trim(),
      issuing_authority: issuingAuthority.trim() || undefined,
      certificate_url: certificateUrl || undefined,
      issue_date: issueDate || undefined,
      expiry_date: expiryDate || undefined,
    });
    setSaving(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Certificate added successfully",
      });
      resetForm();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Certificate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Certificate</DialogTitle>
          <DialogDescription>
            Add a training or safety certificate to your profile
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cert-name">Certificate Name *</Label>
            <Input
              id="cert-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., OSHA Safety Training"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cert-authority">Issuing Authority</Label>
            <Input
              id="cert-authority"
              value={issuingAuthority}
              onChange={(e) => setIssuingAuthority(e.target.value)}
              placeholder="e.g., OSHA, EPA, State Board"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cert-issue">Issue Date</Label>
              <Input
                id="cert-issue"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-expiry">Expiry Date</Label>
              <Input
                id="cert-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Certificate File</Label>
            <div className="flex gap-2">
              <Input
                value={certificateUrl}
                onChange={(e) => setCertificateUrl(e.target.value)}
                placeholder="File URL"
                className="flex-1"
                readOnly={uploading}
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a copy of your certificate (PDF, image, or doc)
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Certificate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCertificateDialog;
