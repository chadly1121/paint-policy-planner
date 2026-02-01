// Training page - displays training requirements from Google Drive
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, CheckCircle2 } from "lucide-react";
import QuizModal from "@/components/quiz/QuizModal";
import { DriveRequiredGuard } from "@/components/drive/DriveRequiredGuard";
import { DriveDocumentList } from "@/components/drive/DriveDocumentList";
import type { DriveFile } from "@/hooks/useDriveFiles";

const SECTION_KEY = "training";

const Training = () => {
  const { t } = useTranslation();
  const [quizOpen, setQuizOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState<DriveFile | null>(null);
  const [quizContent, setQuizContent] = useState("");

  const requiredCertifications = [
    { name: t("certifications.epaRrp"), timeline: t("certifications.within90Days") },
    { name: t("certifications.osha10"), timeline: t("certifications.within6Months") },
    { name: t("certifications.safetyOrientation"), timeline: t("certifications.firstWeek") },
    { name: t("certifications.customerService"), timeline: t("certifications.within30Days") },
  ];

  const handleStartQuiz = (file: DriveFile, content: string) => {
    setCurrentFile(file);
    setQuizContent(content || file.name);
    setQuizOpen(true);
  };

  const handleQuizComplete = (passed: boolean) => {
    if (passed) {
      // Refresh progress here
    }
  };

  return (
    <DriveRequiredGuard moduleName="Training Requirements">
      <div className="space-y-6">
        {/* Quick Reference Card */}
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              {t("sections.training.checklistTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {requiredCertifications.map((cert) => (
                <li key={cert.name} className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-medium text-foreground">{cert.name}</span>
                  <span className="text-muted-foreground">— {cert.timeline}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <DriveDocumentList
          moduleType="training"
          icon={<GraduationCap className="h-5 w-5 text-primary" />}
          title={t("sections.training.title")}
          description={t("sections.training.description")}
          onStartQuiz={handleStartQuiz}
        />

        <QuizModal
          open={quizOpen}
          onClose={() => {
            setQuizOpen(false);
            setCurrentFile(null);
            setQuizContent("");
          }}
          sectionKey={SECTION_KEY}
          sectionTitle={currentFile?.name.replace(/\.[^/.]+$/, '') || ""}
          sectionContent={quizContent}
          onComplete={handleQuizComplete}
          quizType="mini"
          itemKey={currentFile?.id}
        />
      </div>
    </DriveRequiredGuard>
  );
};

export default Training;
