// Safety page - displays safety protocols from Google Drive
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Shield, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import QuizModal from "@/components/quiz/QuizModal";
import { DriveRequiredGuard } from "@/components/drive/DriveRequiredGuard";
import { DriveDocumentList } from "@/components/drive/DriveDocumentList";
import { DocumentAssistant } from "@/components/sop/DocumentAssistant";
import type { DriveFile } from "@/hooks/useDriveFiles";

const SECTION_KEY = "safety";

const Safety = () => {
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
    <DriveRequiredGuard moduleName="Safety Protocols">
      <div className="space-y-4 w-full min-w-0 overflow-hidden">
        {/* AI Assistant - compact at top */}
        <DocumentAssistant suggestions={["What PPE do I need for spraying?","When do I need fall protection?","How do I report a near-miss?"]} />

        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <AlertTitle className="text-destructive">{t("sections.safety.alertTitle")}</AlertTitle>
          <AlertDescription className="text-destructive/90">
            {t("sections.safety.alertDescription")}
          </AlertDescription>
        </Alert>

        <DriveDocumentList
          moduleType="safety"
          icon={<Shield className="h-5 w-5 text-primary" />}
          title={t("sections.safety.title")}
          description={t("sections.safety.description")}
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

export default Safety;
