import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, ChevronDown, ChevronUp, Play } from "lucide-react";

interface SectionItemCardProps {
  itemKey: string;
  title: string;
  content: string;
  isCompleted: boolean;
  source?: "system" | "custom";
  onStartQuiz: () => void;
}

const SectionItemCard = ({ itemKey, title, content, isCompleted, source = "system", onStartQuiz }: SectionItemCardProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Format content with proper line breaks
  const formattedContent = content.split('\n').map((line, idx) => {
    if (line.startsWith('•')) {
      return <li key={idx} className="ml-4">{line.substring(1).trim()}</li>;
    }
    if (line.match(/^\d+\./)) {
      return <li key={idx} className="ml-4 list-decimal">{line.substring(line.indexOf('.') + 1).trim()}</li>;
    }
    if (line.trim() === '') {
      return <br key={idx} />;
    }
    if (line.toUpperCase() === line && line.length > 3) {
      return <h4 key={idx} className="font-semibold mt-3 mb-1 text-primary">{line}</h4>;
    }
    return <p key={idx} className="mb-1">{line}</p>;
  });

  return (
    <Card className={`transition-all ${isCompleted ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/10' : 'border-border'}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isCompleted && (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
              <CardTitle className="text-base font-medium truncate">{title}</CardTitle>
              {source === "custom" ? (
                <Badge variant="secondary" className="text-xs flex-shrink-0">✏️ Custom</Badge>
              ) : (
                <Badge variant="outline" className="text-xs flex-shrink-0">🛡️ System</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isCompleted ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  +10 pts
                </Badge>
              ) : (
                <Button size="sm" variant="outline" onClick={onStartQuiz}>
                  <Play className="h-3 w-3 mr-1" />
                  Quiz
                </Button>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
              {formattedContent}
            </div>
            {!isCompleted && (
              <div className="mt-4 pt-4 border-t">
                <Button onClick={onStartQuiz} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  {t("quiz.takeQuiz")} (2 {t("quiz.questions")})
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default SectionItemCard;
