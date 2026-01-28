import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FileText, Search } from "lucide-react";
import QuizModal from "@/components/quiz/QuizModal";
import SectionItemCard from "@/components/section/SectionItemCard";
import SectionFinalExam from "@/components/section/SectionFinalExam";
import { useProgress } from "@/hooks/useProgress";
import { useSectionItemProgress } from "@/hooks/useSectionItemProgress";

const SECTION_KEY = "policies";

const policyKeys = ["policy1", "policy2", "policy3", "policy4", "policy5", "policy6", "policy7", "policy8", "policy9", "policy10"];

const Policies = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [quizOpen, setQuizOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<{ key: string; title: string; content: string } | null>(null);
  const [isFinalExam, setIsFinalExam] = useState(false);
  
  const { progress, refreshData } = useProgress();
  const { isItemCompleted, getCompletedItemCount, refreshProgress } = useSectionItemProgress(SECTION_KEY);

  const isSectionCompleted = progress?.some(
    (p) => p.section_key === SECTION_KEY && p.completed
  ) ?? false;

  const policyItems = useMemo(() => {
    return policyKeys.map((key, index) => ({
      key,
      id: `policy-${index + 1}`,
      title: t(`policies.${key}.title`),
      content: t(`policies.${key}.content`),
    }));
  }, [t]);

  const totalItems = policyItems.length;
  const completedItems = getCompletedItemCount();
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return policyItems;
    const query = searchQuery.toLowerCase();
    return policyItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
    );
  }, [searchQuery, policyItems]);

  const allContent = useMemo(() => 
    policyItems.map(item => `${item.title}: ${item.content}`).join('\n\n'),
  [policyItems]);

  const handleStartMiniQuiz = (item: { key: string; title: string; content: string }) => {
    setCurrentItem(item);
    setIsFinalExam(false);
    setQuizOpen(true);
  };

  const handleStartFinalExam = () => {
    setCurrentItem(null);
    setIsFinalExam(true);
    setQuizOpen(true);
  };

  const handleQuizComplete = (passed: boolean) => {
    if (passed) {
      refreshProgress();
      refreshData();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="font-serif">{t("sections.policies.title")}</CardTitle>
              <CardDescription>{t("sections.policies.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("section.progress")}</span>
              <span className="font-medium">{completedItems} / {totalItems}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("sections.policies.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <SectionFinalExam
        sectionTitle={t("sections.policies.title")}
        completedCount={completedItems}
        totalCount={totalItems}
        isFinalExamCompleted={isSectionCompleted}
        onStartFinalExam={handleStartFinalExam}
      />

      <div className="space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((item, index) => (
            <SectionItemCard
              key={item.key}
              itemKey={item.key}
              title={item.title}
              content={item.content}
              isCompleted={isItemCompleted(item.key)}
              itemNumber={index + 1}
              sectionPrefix="POLICY"
              onStartQuiz={() => handleStartMiniQuiz(item)}
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
          setCurrentItem(null);
          setIsFinalExam(false);
        }}
        sectionKey={SECTION_KEY}
        sectionTitle={isFinalExam ? t("sections.policies.title") + " " + t("section.finalExam") : currentItem?.title || ""}
        sectionContent={isFinalExam ? allContent : currentItem?.content || ""}
        onComplete={handleQuizComplete}
        quizType={isFinalExam ? "final" : "mini"}
        itemKey={currentItem?.key}
      />
    </div>
  );
};

export default Policies;
