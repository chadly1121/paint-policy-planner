import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, ChevronDown, ChevronUp, Play, Pencil, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useCompanyContent } from "@/hooks/useCompanyContent";

interface SOPCardProps {
  sopKey: string;
  title: string;
  content: string;
  isCompleted: boolean;
  onStartQuiz: () => void;
  onEdit?: () => void;
}

const SOPCard = ({ sopKey, title, content, isCompleted, onStartQuiz, onEdit }: SOPCardProps) => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { enableCustomSOPs } = useCompanySettings();
  const { getCompanySOP } = useCompanyContent();
  const [isOpen, setIsOpen] = useState(false);

  const companySOP = getCompanySOP(sopKey);
  const isCustomized = !!companySOP;
  const displayTitle = isCustomized ? companySOP.title : title;
  const displayContent = isCustomized ? companySOP.content : content;

  // Format content with proper line breaks
  const formattedContent = displayContent.split('\n').map((line, idx) => {
    if (line.startsWith('•')) {
      return <li key={idx} className="ml-4">{line.substring(1).trim()}</li>;
    }
    if (line.match(/^\d+\./)) {
      return <li key={idx} className="ml-4 list-decimal">{line.substring(line.indexOf('.') + 1).trim()}</li>;
    }
    if (line.trim() === '') {
      return <br key={idx} />;
    }
    if (line.startsWith('---')) {
      return <hr key={idx} className="my-3 border-border" />;
    }
    if (line.startsWith('⚠️')) {
      return <p key={idx} className="text-amber-600 dark:text-amber-400 text-sm font-medium mt-2">{line}</p>;
    }
    if (line.toUpperCase() === line && line.length > 3) {
      return <h4 key={idx} className="font-semibold mt-3 mb-1 text-primary">{line}</h4>;
    }
    return <p key={idx} className="mb-1">{line}</p>;
  });

  const canEdit = isAdmin && enableCustomSOPs;

  return (
    <Card className={`transition-all ${isCompleted ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/10' : 'border-border'}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isCompleted && (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
              <CardTitle className="text-base font-medium truncate">{displayTitle}</CardTitle>
              {isCustomized ? (
                <Badge variant="secondary" className="text-xs flex-shrink-0">✏️ Custom</Badge>
              ) : canEdit ? (
                <Badge variant="outline" className="text-xs flex-shrink-0">🛡️ System</Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {canEdit && onEdit && (
                <Button size="sm" variant="ghost" onClick={onEdit} className="text-muted-foreground hover:text-primary">
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
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

export default SOPCard;
