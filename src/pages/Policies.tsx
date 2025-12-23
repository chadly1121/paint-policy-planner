import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import PolicySection from "@/components/manual/PolicySection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileText, Search } from "lucide-react";
import SectionLock from "@/components/gamification/SectionLock";
import QuizModal from "@/components/quiz/QuizModal";
import { useProgress } from "@/hooks/useProgress";

const SECTION_KEY = "policies";

const policyKeys = ["policy1", "policy2", "policy3", "policy4", "policy5", "policy6", "policy7", "policy8", "policy9", "policy10"];

const Policies = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [quizOpen, setQuizOpen] = useState(false);
  
  const { progress, isSectionUnlocked, refreshData } = useProgress();

  const isCompleted = progress?.some(
    (p) => p.section_key === SECTION_KEY && p.completed
  ) ?? false;

  const isUnlocked = isSectionUnlocked(SECTION_KEY);

  const policyItems = useMemo(() => {
    return policyKeys.map((key, index) => ({
      id: `policy-${index + 1}`,
      title: t(`policies.${key}.title`),
      content: t(`policies.${key}.content`),
    }));
  }, [t]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return policyItems;
    
    const query = searchQuery.toLowerCase();
    return policyItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query)
    );
  }, [searchQuery, policyItems]);

  const sectionContent = useMemo(() => {
    return policyItems.map(item => `${item.title}: ${item.content}`).join('\n\n');
  }, [policyItems]);

  const handleQuizComplete = (passed: boolean) => {
    if (passed) {
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
            <div>
              <CardTitle className="font-serif">{t("sections.policies.title")}</CardTitle>
              <CardDescription>
                {t("sections.policies.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SectionLock
            isUnlocked={isUnlocked}
            isCompleted={isCompleted}
            sectionTitle={t("sections.policies.title")}
            onStartQuiz={() => setQuizOpen(true)}
          />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("sections.policies.searchPlaceholder")}
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
        sectionTitle={t("sections.policies.title")}
        sectionContent={sectionContent}
        onComplete={handleQuizComplete}
      />
    </div>
  );
};

export default Policies;
