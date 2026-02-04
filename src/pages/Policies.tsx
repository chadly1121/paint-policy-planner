// Policies page - displays company policies from Google Drive
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import QuizModal from "@/components/quiz/QuizModal";
import { DriveRequiredGuard } from "@/components/drive/DriveRequiredGuard";
import { DriveDocumentList } from "@/components/drive/DriveDocumentList";
import { DocumentAssistant } from "@/components/sop/DocumentAssistant";
import type { DriveFile } from "@/hooks/useDriveFiles";

const SECTION_KEY = "policies";

const Policies = () => {
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
    <DriveRequiredGuard moduleName="Company Policies">
      <div className="space-y-4 w-full min-w-0 overflow-hidden">
        {/* AI Assistant - compact at top */}
        <DocumentAssistant />
        
        {/* Document List - full width */}
        <DriveDocumentList
          moduleType="policies"
          icon={<FileText className="h-5 w-5 text-primary" />}
          title={t("sections.policies.title")}
          description={t("sections.policies.description")}
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

export default Policies;
