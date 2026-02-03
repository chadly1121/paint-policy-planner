// Training page - displays training requirements from Google Drive
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap } from "lucide-react";
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
