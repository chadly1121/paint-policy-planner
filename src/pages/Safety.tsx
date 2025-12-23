import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import PolicySection from "@/components/manual/PolicySection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Shield, AlertCircle, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import SectionLock from "@/components/gamification/SectionLock";
import QuizModal from "@/components/quiz/QuizModal";
import { useProgress } from "@/hooks/useProgress";

const SECTION_KEY = "safety";
const PREVIOUS_SECTION = "sops";

const safetyKeys = ["safety1", "safety2", "safety3", "safety4", "safety5", "safety6"];

const Safety = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [quizOpen, setQuizOpen] = useState(false);
  
  const { progress, isSectionUnlocked, refreshData } = useProgress();

  const isCompleted = progress?.some(
    (p) => p.section_key === SECTION_KEY && p.completed
  ) ?? false;

  const isUnlocked = isSectionUnlocked(SECTION_KEY);

  const safetyItems = useMemo(() => {
    return safetyKeys.map((key, index) => ({
      id: `safety-${index + 1}`,
      title: t(`safety.${key}.title`),
      content: t(`safety.${key}.content`),
    }));
  }, [t]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return safetyItems;
    
    const query = searchQuery.toLowerCase();
    return safetyItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
    );
  }, [searchQuery, safetyItems]);

  const sectionContent = useMemo(() => {
    return safetyItems.map(item => `${item.title}: ${item.content}`).join('\n\n');
  }, [safetyItems]);

  const handleQuizComplete = (passed: boolean) => {
    if (passed) {
      refreshData();
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="border-destructive/50 bg-destructive/10">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <AlertTitle className="text-destructive">{t("sections.safety.alertTitle")}</AlertTitle>
        <AlertDescription className="text-destructive/90">
          {t("sections.safety.alertDescription")}
        </AlertDescription>
      </Alert>

      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-serif">{t("sections.safety.title")}</CardTitle>
              <CardDescription>
                {t("sections.safety.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SectionLock
            isUnlocked={isUnlocked}
            isCompleted={isCompleted}
            sectionTitle={t("sections.safety.title")}
            onStartQuiz={() => setQuizOpen(true)}
          />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("sections.safety.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {filteredItems.length > 0 ? (
            <PolicySection items={filteredItems} />
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t("common.noResults")} "{searchQuery}"
            </p>
          )}
        </CardContent>
      </Card>

      <QuizModal
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        sectionKey={SECTION_KEY}
        sectionTitle={t("sections.safety.title")}
        sectionContent={sectionContent}
        onComplete={handleQuizComplete}
      />
    </div>
  );
};

export default Safety;
