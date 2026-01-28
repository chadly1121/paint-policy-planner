// SOPs page - displays assigned SOPs with acknowledgment tracking
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, Search } from "lucide-react";
import QuizModal from "@/components/quiz/QuizModal";
import SOPCard from "@/components/sop/SOPCard";
import SOPFinalExam from "@/components/sop/SOPFinalExam";
import OrgSOPEditor from "@/components/admin/OrgSOPEditor";
import { useProgress } from "@/hooks/useProgress";
import { useOrgSops } from "@/hooks/useOrgSops";
import { useOrg } from "@/contexts/OrganizationContext";

const SECTION_KEY = "sops";

interface SOPItem {
  id: string;
  title: string;
  content: string;
  source: string;
  systemKey: string | null;
  version: number;
  ackEpoch: number;
  ackRequired: boolean;
  isAcknowledged: boolean;
}

const SOPs = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [quizOpen, setQuizOpen] = useState(false);
  const [currentSOP, setCurrentSOP] = useState<SOPItem | null>(null);
  const [isFinalExam, setIsFinalExam] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSOP, setEditingSOP] = useState<SOPItem | null>(null);
  
  const { progress, refreshData } = useProgress();
  const { assignedSops, loading, hasAcknowledged, refresh } = useOrgSops();
  const { isOrgAdmin } = useOrg();

  const isSectionCompleted = progress?.some(
    (p) => p.section_key === SECTION_KEY && p.completed
  ) ?? false;

  // Map assigned SOPs to component format
  const sopItems: SOPItem[] = useMemo(() => 
    assignedSops.map((sop) => ({
      id: sop.sop_id,
      title: sop.title,
      content: sop.content_md,
      source: sop.source,
      systemKey: sop.system_key,
      version: sop.version,
      ackEpoch: sop.ack_epoch,
      ackRequired: sop.ack_required,
      isAcknowledged: sop.is_acknowledged,
    })),
  [assignedSops]);

  const completedSOPs = sopItems.filter((sop) => sop.isAcknowledged).length;
  const totalSOPs = sopItems.length;
  const progressPercent = totalSOPs > 0 ? Math.round((completedSOPs / totalSOPs) * 100) : 0;

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return sopItems;
    const query = searchQuery.toLowerCase();
    return sopItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
    );
  }, [searchQuery, sopItems]);

  const allSOPContent = useMemo(() => 
    sopItems.map(item => `${item.title}: ${item.content}`).join('\n\n'),
  [sopItems]);

  const handleStartMiniQuiz = (sop: SOPItem) => {
    setCurrentSOP(sop);
    setIsFinalExam(false);
    setQuizOpen(true);
  };

  const handleStartFinalExam = () => {
    setCurrentSOP(null);
    setIsFinalExam(true);
    setQuizOpen(true);
  };

  const handleQuizComplete = (passed: boolean) => {
    if (passed) {
      refresh();
      refreshData();
    }
  };

  const handleEditSOP = (sop: SOPItem) => {
    setEditingSOP(sop);
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditingSOP(null);
    refresh();
  };

  // Show loading state via conditional rendering (not early return) 
  // to ensure consistent hook count across renders
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="font-serif">{t("sections.sops.title")}</CardTitle>
              <CardDescription>{t("sections.sops.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("sops.progress")}</span>
              <span className="font-medium">{completedSOPs} / {totalSOPs} SOPs</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("sections.sops.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <SOPFinalExam
        completedCount={completedSOPs}
        totalCount={totalSOPs}
        isFinalExamCompleted={isSectionCompleted}
        onStartFinalExam={handleStartFinalExam}
      />

      <div className="space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((sop) => (
            <SOPCard
              key={sop.id}
              sopId={sop.id}
              title={sop.title}
              content={sop.content}
              source={sop.source}
              isAcknowledged={sop.isAcknowledged}
              ackRequired={sop.ackRequired}
              version={sop.version}
              ackEpoch={sop.ackEpoch}
              canEdit={isOrgAdmin && sop.source === "org"}
              onStartQuiz={() => handleStartMiniQuiz(sop)}
              onEdit={() => handleEditSOP(sop)}
              onAckSuccess={refresh}
            />
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">
            {searchQuery ? `${t("common.noResults")} "${searchQuery}"` : "No SOPs assigned to your role."}
          </p>
        )}
      </div>

      <QuizModal
        open={quizOpen}
        onClose={() => {
          setQuizOpen(false);
          setCurrentSOP(null);
          setIsFinalExam(false);
        }}
        sectionKey={SECTION_KEY}
        sectionTitle={isFinalExam ? t("sops.finalExam") : currentSOP?.title || ""}
        sectionContent={isFinalExam ? allSOPContent : currentSOP?.content || ""}
        onComplete={handleQuizComplete}
        quizType={isFinalExam ? "final" : "mini"}
        itemKey={currentSOP?.id}
      />

      {editingSOP && (
        <OrgSOPEditor
          open={editorOpen}
          onClose={handleEditorClose}
          sopId={editingSOP.id}
          currentTitle={editingSOP.title}
          currentContent={editingSOP.content}
        />
      )}
    </div>
  );
};

export default SOPs;
