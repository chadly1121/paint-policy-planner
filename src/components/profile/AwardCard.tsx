import { useState } from "react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Calendar, Trash2, ZoomIn, Download, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AwardCardProps {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  awardedDate: string | null;
  canEdit: boolean;
  onDelete: (id: string) => Promise<{ error: Error | null }>;
}

// Convert image URL to base64 data URL for jsPDF embedding
const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const AwardCard = ({
  id,
  title,
  description,
  imageUrl,
  awardedDate,
  canEdit,
  onDelete,
}: AwardCardProps) => {
  const { user } = useAuth();
  const { org } = useOrg();
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(id);
    setDeleting(false);
  };

  const handlePrintCertificate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const fullName = profile?.full_name || "Recipient";
      const orgName = org?.name || "Your Organization";
      const dateStr = awardedDate
        ? format(new Date(awardedDate), "MMMM d, yyyy")
        : format(new Date(), "MMMM d, yyyy");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const centerX = pageWidth / 2;

      // Background
      doc.setFillColor(255, 250, 240);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Borders
      doc.setDrawColor(180, 150, 100);
      doc.setLineWidth(3);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
      doc.setLineWidth(0.5);
      doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

      // Org logo
      if (org?.logo_url) {
        const dataUrl = await fetchImageAsDataUrl(org.logo_url);
        if (dataUrl) {
          try {
            const fmt = dataUrl.includes("image/png") ? "PNG" : "JPEG";
            doc.addImage(dataUrl, fmt, centerX - 15, 22, 30, 20, undefined, "FAST");
          } catch (e) {
            console.warn("Logo embed failed:", e);
          }
        }
      }

      // Org name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text(orgName, centerX, 52, { align: "center" });

      // Heading
      doc.setFont("helvetica", "bold");
      doc.setFontSize(32);
      doc.setTextColor(60, 60, 60);
      doc.text("Certificate of Achievement", centerX, 75, { align: "center" });

      // Body
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text("Awarded to", centerX, 95, { align: "center" });

      // Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.setTextColor(40, 40, 40);
      doc.text(fullName, centerX, 110, { align: "center" });

      const nameWidth = doc.getTextWidth(fullName);
      doc.setDrawColor(180, 150, 100);
      doc.setLineWidth(0.5);
      doc.line(centerX - nameWidth / 2 - 15, 114, centerX + nameWidth / 2 + 15, 114);

      // Award title
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text(`for earning the "${title}" award on ${dateStr}`, centerX, 128, {
        align: "center",
      });

      // Description
      if (description) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(12);
        doc.setTextColor(110, 110, 110);
        const wrapped = doc.splitTextToSize(description, pageWidth - 80);
        doc.text(wrapped, centerX, 145, { align: "center" });
      }

      // Footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Issued by ${orgName} via SOPed.ai`,
        centerX,
        pageHeight - 30,
        { align: "center" }
      );
      doc.text(
        `Date issued: ${format(new Date(), "MMMM d, yyyy")}`,
        centerX,
        pageHeight - 24,
        { align: "center" }
      );

      const initials = fullName
        .split(/\s+/)
        .map((s) => s[0])
        .filter(Boolean)
        .join("")
        .toUpperCase()
        .slice(0, 3);
      const codeSlug = title.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 30);
      const dateSlug = new Date().toISOString().split("T")[0];
      doc.save(`Award_${initials}_${codeSlug}_${dateSlug}.pdf`);
      toast.success("Certificate downloaded");
    } catch (err) {
      console.error("Award certificate error:", err);
      toast.error("Failed to generate certificate");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      {imageUrl && (
        <Dialog>
          <DialogTrigger asChild>
            <div className="relative aspect-video cursor-pointer group">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white" />
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <img src={imageUrl} alt={title} className="w-full h-auto rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {!imageUrl && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <h4 className="font-medium">{title}</h4>
              
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
              )}
              
              {awardedDate && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(awardedDate), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrintCertificate}
                disabled={generating}
                title="Print certificate"
              >
                {generating ? (
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
                    <AlertDialogTitle>Delete Award</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{title}"? This action cannot be undone.
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

export default AwardCard;
