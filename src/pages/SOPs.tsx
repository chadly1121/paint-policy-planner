// SOPs page - displays SOPs from Google Drive with acknowledgment tracking
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList } from "lucide-react";
import QuizModal from "@/components/quiz/QuizModal";
import { DriveRequiredGuard } from "@/components/drive/DriveRequiredGuard";
import { DriveDocumentList } from "@/components/drive/DriveDocumentList";
import { SOPAssistant } from "@/components/sop/SOPAssistant";
import type { DriveFile } from "@/hooks/useDriveFiles";

const SECTION_KEY = "sops";

const SOPs = () => {
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
      // Refresh acknowledgments here
    }
  };

  return (
    <DriveRequiredGuard moduleName="SOPs">
      <div className="space-y-6">
        {/* Responsive grid: stacked on mobile/tablet, side-by-side on desktop */}
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 order-2 xl:order-1">
            <DriveDocumentList
              moduleType="sops"
              icon={<ClipboardList className="h-5 w-5 text-primary" />}
              title={t("sections.sops.title")}
              description={t("sections.sops.description")}
              onStartQuiz={handleStartQuiz}
            />
          </div>
          <div className="xl:col-span-1 order-1 xl:order-2">
            <SOPAssistant />
          </div>
        </div>

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

export default SOPs;
