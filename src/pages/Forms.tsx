// Forms page - displays operational forms from Google Drive (Forms folder)
import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import QuizModal from "@/components/quiz/QuizModal";
import { DriveRequiredGuard } from "@/components/drive/DriveRequiredGuard";
import { DriveDocumentList } from "@/components/drive/DriveDocumentList";
import { DocumentAssistant } from "@/components/sop/DocumentAssistant";
import type { DriveFile } from "@/hooks/useDriveFiles";

const SECTION_KEY = "forms";

const Forms = () => {
  const [quizOpen, setQuizOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState<DriveFile | null>(null);
  const [quizContent, setQuizContent] = useState("");

  const handleStartQuiz = (file: DriveFile, content: string) => {
    setCurrentFile(file);
    setQuizContent(content || file.name);
    setQuizOpen(true);
  };

  const handleQuizComplete = (passed: boolean) => {
    if (passed) window.location.reload();
  };

  return (
    <DriveRequiredGuard moduleName="Forms">
      <div className="space-y-4 w-full min-w-0 overflow-hidden">
        <DocumentAssistant
          suggestions={[
            "How do I submit a clock correction?",
            "Where do I log my mileage?",
            "What's on the daily job-start checklist?",
            "How do I file a vehicle inspection?",
          ]}
        />

        <DriveDocumentList
          moduleType="forms"
          icon={<FileSpreadsheet className="h-5 w-5 text-primary" />}
          title="Forms"
          description="Operational forms: clock corrections, mileage logs, vehicle inspections, daily checklists."
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
          sectionTitle={currentFile?.name.replace(/\.[^/.]+$/, "") || ""}
          sectionContent={quizContent}
          onComplete={handleQuizComplete}
          quizType="mini"
          itemKey={currentFile?.id}
        />
      </div>
    </DriveRequiredGuard>
  );
};

export default Forms;
