import { useState } from "react";
import { format, differenceInDays, isPast } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Award, Calendar, Building2, Trash2, AlertTriangle, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CertificateCardProps {
  id: string;
  name: string;
  issuingAuthority: string | null;
  certificateUrl: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  canEdit: boolean;
  onDelete: (id: string) => Promise<{ error: Error | null }>;
}

const CertificateCard = ({
  id,
  name,
  issuingAuthority,
  certificateUrl,
  issueDate,
  expiryDate,
  canEdit,
  onDelete,
}: CertificateCardProps) => {
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!certificateUrl) return;
    setDownloading(true);
    try {
      let downloadUrl = certificateUrl;
      // If URL points at our supabase storage bucket, sign it
      const match = certificateUrl.match(/\/storage\/v1\/object\/(?:public\/)?employee-files\/(.+?)(\?|$)/);
      if (match) {
        const path = decodeURIComponent(match[1]);
        const { data, error } = await supabase.storage
          .from("employee-files")
          .createSignedUrl(path, 300);
        if (error) throw error;
        downloadUrl = data.signedUrl;
      }
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Download started");
    } catch (err) {
      console.error("Certificate download error:", err);
      toast.error("Failed to download certificate");
    } finally {
      setDownloading(false);
    }
  };

  const getExpiryStatus = () => {
    if (!expiryDate) return null;
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = differenceInDays(expiry, now);
    
    if (isPast(expiry)) {
      return { status: "expired", label: "Expired", variant: "destructive" as const };
    } else if (daysUntilExpiry <= 7) {
      return { status: "critical", label: `${daysUntilExpiry} days left`, variant: "destructive" as const };
    } else if (daysUntilExpiry <= 30) {
      return { status: "warning", label: `${daysUntilExpiry} days left`, variant: "secondary" as const };
    }
    return null;
  };

  const expiryStatus = getExpiryStatus();

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(id);
    setDeleting(false);
  };

  return (
    <Card className={`relative ${expiryStatus?.status === "expired" ? "border-destructive/50 bg-destructive/5" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium truncate">{name}</h4>
                {expiryStatus && (
                  <Badge variant={expiryStatus.variant} className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {expiryStatus.label}
                  </Badge>
                )}
              </div>
              
              {issuingAuthority && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {issuingAuthority}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {issueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Issued: {format(new Date(issueDate), "MMM d, yyyy")}
                  </span>
                )}
                {expiryDate && (
                  <span className={`flex items-center gap-1 ${expiryStatus?.status === "expired" ? "text-destructive" : ""}`}>
                    <Calendar className="h-3 w-3" />
                    Expires: {format(new Date(expiryDate), "MMM d, yyyy")}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {certificateUrl && canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
                disabled={downloading}
                title="Download certificate"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            )}


            
            {canEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Certificate</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                      {deleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CertificateCard;
