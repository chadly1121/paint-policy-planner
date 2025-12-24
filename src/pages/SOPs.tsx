import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, Search } from "lucide-react";
import QuizModal from "@/components/quiz/QuizModal";
import SOPCard from "@/components/sop/SOPCard";
import SOPFinalExam from "@/components/sop/SOPFinalExam";
import SOPEditor from "@/components/admin/SOPEditor";
import { useProgress } from "@/hooks/useProgress";
import { useSOPProgress } from "@/hooks/useSOPProgress";
import { useCompanyContent } from "@/hooks/useCompanyContent";

const SECTION_KEY = "sops";

const SOPs = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [quizOpen, setQuizOpen] = useState(false);
  const [currentSOP, setCurrentSOP] = useState<{ key: string; title: string; content: string } | null>(null);
  const [isFinalExam, setIsFinalExam] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSOP, setEditingSOP] = useState<{ key: string; title: string; content: string } | null>(null);
  
  const { progress, refreshData } = useProgress();
  const { sopProgress, isSOPCompleted, getCompletedSOPCount, refreshProgress } = useSOPProgress();
  const { getCompanySOP } = useCompanyContent();

  const isSectionCompleted = progress?.some(
    (p) => p.section_key === SECTION_KEY && p.completed
  ) ?? false;

  // Generate SOP items from translations
  const sopKeys = Array.from({ length: 55 }, (_, i) => `sop${String(i + 1).padStart(3, '0')}`);
  
  const sopItems = useMemo(() => 
    sopKeys.map((key, idx) => ({
      key,
      id: `sop-${String(idx + 1).padStart(3, '0')}`,
      title: t(`sops.${key}.title`, { defaultValue: '' }),
      content: t(`sops.${key}.content`, { defaultValue: '' }),
    })).filter(item => item.title && item.content),
  [t, sopKeys]);

  const totalSOPs = sopItems.length;
  const completedSOPs = getCompletedSOPCount();
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

  // For content, use company version if exists
  const getSOPContent = (sop: { key: string; title: string; content: string }) => {
    const companySOP = getCompanySOP(sop.key);
    return companySOP 
      ? { title: companySOP.title, content: companySOP.content }
      : { title: sop.title, content: sop.content };
  };

  const allSOPContent = useMemo(() => 
    sopItems.map(item => {
      const { title, content } = getSOPContent(item);
      return `${title}: ${content}`;
    }).join('\n\n'),
  [sopItems, getCompanySOP]);

  const handleStartMiniQuiz = (sop: { key: string; title: string; content: string }) => {
    const { title, content } = getSOPContent(sop);
    setCurrentSOP({ key: sop.key, title, content });
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
      refreshProgress();
      refreshData();
    }
  };

  const handleEditSOP = (sop: { key: string; title: string; content: string }) => {
    setEditingSOP(sop);
    setEditorOpen(true);
  };

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
              key={sop.key}
              sopKey={sop.key}
              title={sop.title}
              content={sop.content}
              isCompleted={isSOPCompleted(sop.key)}
              onStartQuiz={() => handleStartMiniQuiz(sop)}
              onEdit={() => handleEditSOP(sop)}
            />
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">
            {t("common.noResults")} "{searchQuery}"
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
        itemKey={currentSOP?.key}
      />

      {editingSOP && (
        <SOPEditor
          open={editorOpen}
          onClose={() => {
            setEditorOpen(false);
            setEditingSOP(null);
          }}
          sopKey={editingSOP.key}
          systemTitle={editingSOP.title}
          systemContent={editingSOP.content}
        />
      )}
    </div>
  );
};

export default SOPs;
