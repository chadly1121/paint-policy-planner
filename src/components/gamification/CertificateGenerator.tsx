import { useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Award, Download, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CertificateGeneratorProps {
  completedSections: number;
  totalSections: number;
}

const CertificateGenerator = ({ completedSections, totalSections }: CertificateGeneratorProps) => {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [open, setOpen] = useState(false);

  const isComplete = completedSections === totalSections;

  const fetchUserName = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();
    
    if (data) {
      setUserName(data.full_name);
    }
  };

  const generateCertificate = async () => {
    setGenerating(true);
    await fetchUserName();

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Background gradient effect (light gold)
      doc.setFillColor(255, 250, 240);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Border
      doc.setDrawColor(180, 150, 100);
      doc.setLineWidth(3);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
      
      // Inner border
      doc.setLineWidth(0.5);
      doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

      // Decorative corners
      const cornerSize = 15;
      doc.setLineWidth(1);
      
      // Top left
      doc.line(10, 25, 10 + cornerSize, 25);
      doc.line(25, 10, 25, 10 + cornerSize);
      
      // Top right
      doc.line(pageWidth - 10, 25, pageWidth - 10 - cornerSize, 25);
      doc.line(pageWidth - 25, 10, pageWidth - 25, 10 + cornerSize);
      
      // Bottom left
      doc.line(10, pageHeight - 25, 10 + cornerSize, pageHeight - 25);
      doc.line(25, pageHeight - 10, 25, pageHeight - 10 - cornerSize);
      
      // Bottom right
      doc.line(pageWidth - 10, pageHeight - 25, pageWidth - 10 - cornerSize, pageHeight - 25);
      doc.line(pageWidth - 25, pageHeight - 10, pageWidth - 25, pageHeight - 10 - cornerSize);

      // Award icon placeholder (star shape)
      const centerX = pageWidth / 2;
      doc.setFillColor(180, 150, 100);
      doc.circle(centerX, 45, 12, "F");
      doc.setFillColor(255, 250, 240);
      doc.circle(centerX, 45, 8, "F");
      doc.setFillColor(180, 150, 100);
      doc.circle(centerX, 45, 4, "F");

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(36);
      doc.setTextColor(60, 60, 60);
      doc.text("CERTIFICATE OF COMPLETION", centerX, 75, { align: "center" });

      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text("This certificate is presented to", centerX, 90, { align: "center" });

      // Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(40, 40, 40);
      doc.text(userName || "Employee", centerX, 110, { align: "center" });

      // Name underline
      doc.setDrawColor(180, 150, 100);
      doc.setLineWidth(0.5);
      const nameWidth = doc.getTextWidth(userName || "Employee");
      doc.line(centerX - nameWidth / 2 - 20, 115, centerX + nameWidth / 2 + 20, 115);

      // Achievement text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text("for successfully completing all sections of the", centerX, 130, { align: "center" });

      // Company name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(60, 60, 60);
      doc.text("Roll On Painting Employee Manual", centerX, 145, { align: "center" });

      // Sections completed
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(
        "Including: Standard Operating Procedures, Safety Protocols, Company Policies,",
        centerX,
        160,
        { align: "center" }
      );
      doc.text("Training Requirements, and Disciplinary Procedures", centerX, 168, {
        align: "center",
      });

      // Date
      const completionDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      
      doc.setFontSize(12);
      doc.text("Date of Completion:", centerX - 50, 185, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text(completionDate, centerX + 20, 185, { align: "center" });

      // Signature line
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.3);
      doc.line(centerX - 40, 195, centerX + 40, 195);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Authorized Signature", centerX, 200, { align: "center" });

      // Download
      doc.save(`Certificate_${userName?.replace(/\s+/g, "_") || "Employee"}_${new Date().toISOString().split("T")[0]}.pdf`);
      
      setOpen(false);
    } catch (error) {
      console.error("Error generating certificate:", error);
    } finally {
      setGenerating(false);
    }
  };

  if (!isComplete) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
          <Award className="h-4 w-4" />
          Download Certificate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Congratulations!
          </DialogTitle>
          <DialogDescription>
            You've completed all sections of the Employee Manual. Download your certificate of completion.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-full aspect-[297/210] bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border-2 border-amber-200 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Award className="h-12 w-12 text-amber-600 mx-auto" />
              <p className="font-serif text-lg font-bold text-amber-800">Certificate Preview</p>
              <p className="text-sm text-amber-600">Roll On Painting</p>
            </div>
          </div>
          <Button onClick={generateCertificate} disabled={generating} className="w-full gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF Certificate
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CertificateGenerator;
