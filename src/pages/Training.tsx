import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, CheckCircle2, Search } from "lucide-react";
import QuizModal from "@/components/quiz/QuizModal";
import SectionItemCard from "@/components/section/SectionItemCard";
import SectionFinalExam from "@/components/section/SectionFinalExam";
import { useProgress } from "@/hooks/useProgress";
import { useSectionItemProgress } from "@/hooks/useSectionItemProgress";

const SECTION_KEY = "training";

const trainingKeys = ["training1", "training2", "training3", "training4", "training5"];

const Training = () => {
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

  const trainingItems = useMemo(() => {
    return trainingKeys.map((key, index) => ({
      key,
      id: `training-${index + 1}`,
      title: t(`training.${key}.title`),
      content: t(`training.${key}.content`),
    }));
  }, [t]);

  const requiredCertifications = [
    { name: t("certifications.epaRrp"), timeline: t("certifications.within90Days") },
    { name: t("certifications.osha10"), timeline: t("certifications.within6Months") },
    { name: t("certifications.safetyOrientation"), timeline: t("certifications.firstWeek") },
    { name: t("certifications.customerService"), timeline: t("certifications.within30Days") },
  ];

  const totalItems = trainingItems.length;
  const completedItems = getCompletedItemCount();
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return trainingItems;
    const query = searchQuery.toLowerCase();
    return trainingItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
    );
  }, [searchQuery, trainingItems]);

  const allContent = useMemo(() => 
    trainingItems.map(item => `${item.title}: ${item.content}`).join('\n\n'),
  [trainingItems]);

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

      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="font-serif">{t("sections.training.title")}</CardTitle>
              <CardDescription>{t("sections.training.description")}</CardDescription>
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
              placeholder={t("sections.training.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <SectionFinalExam
        sectionTitle={t("sections.training.title")}
        completedCount={completedItems}
        totalCount={totalItems}
        isFinalExamCompleted={isSectionCompleted}
        onStartFinalExam={handleStartFinalExam}
      />

      <div className="space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <SectionItemCard
              key={item.key}
              itemKey={item.key}
              title={item.title}
              content={item.content}
              isCompleted={isItemCompleted(item.key)}
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
        sectionTitle={isFinalExam ? t("sections.training.title") + " " + t("section.finalExam") : currentItem?.title || ""}
        sectionContent={isFinalExam ? allContent : currentItem?.content || ""}
        onComplete={handleQuizComplete}
        quizType={isFinalExam ? "final" : "mini"}
        itemKey={currentItem?.key}
      />
    </div>
  );
};

export default Training;
