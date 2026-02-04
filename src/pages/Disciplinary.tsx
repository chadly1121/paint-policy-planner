// Disciplinary page - displays disciplinary procedures from Google Drive
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import QuizModal from "@/components/quiz/QuizModal";
import { DriveRequiredGuard } from "@/components/drive/DriveRequiredGuard";
import { DriveDocumentList } from "@/components/drive/DriveDocumentList";
import { DocumentAssistant } from "@/components/sop/DocumentAssistant";
import type { DriveFile } from "@/hooks/useDriveFiles";

const SECTION_KEY = "disciplinary";

const Disciplinary = () => {
  const { t } = useTranslation();
  const [quizOpen, setQuizOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState<DriveFile | null>(null);
  const [quizContent, setQuizContent] = useState("");

  const handleStartQuiz = (file: DriveFile, content: string) => {
    setCurrentFile(file);
    setQuizContent(content || file.name);
    setQuizOpen(true);
  };

  const handleQuizComplete = (passed: boolean) => {
    if (passed) {
      window.location.reload();
    }
  };

  return (
    <DriveRequiredGuard moduleName="Disciplinary Procedures">
      <div className="space-y-4 w-full min-w-0 overflow-hidden">
        {/* AI Assistant - compact at top */}
        <DocumentAssistant />

        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Info className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-700">{t("sections.disciplinary.alertTitle")}</AlertTitle>
          <AlertDescription className="text-amber-700/90">
            {t("sections.disciplinary.alertDescription")}
          </AlertDescription>
        </Alert>

        <DriveDocumentList
          moduleType="disciplinary"
          icon={<AlertTriangle className="h-5 w-5 text-primary" />}
          title={t("sections.disciplinary.title")}
          description={t("sections.disciplinary.description")}
          onStartQuiz={handleStartQuiz}
        />

        {/* Acknowledgment Note */}
        <Card className="border-muted">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Important:</strong> {t("sections.disciplinary.acknowledgment")}
            </p>
          </CardContent>
        </Card>

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

export default Disciplinary;
