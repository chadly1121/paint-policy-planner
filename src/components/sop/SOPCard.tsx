import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, ChevronDown, ChevronUp, Play, Pencil, FileCheck } from "lucide-react";
import { useOrgSops } from "@/hooks/useOrgSops";
import { useToast } from "@/hooks/use-toast";

interface SOPCardProps {
  sopId: string;
  title: string;
  content: string;
  source: string;
  isAcknowledged: boolean;
  ackRequired: boolean;
  version: number;
  ackEpoch: number;
  canEdit: boolean;
  itemNumber?: number;
  onStartQuiz: () => void;
  onEdit?: () => void;
  onAckSuccess?: () => void;
}

const SOPCard = ({ 
  sopId, 
  title, 
  content, 
  source,
  isAcknowledged, 
  ackRequired,
  version,
  ackEpoch,
  canEdit,
  itemNumber,
  onStartQuiz, 
  onEdit,
  onAckSuccess
}: SOPCardProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { acknowledgeSop } = useOrgSops();
  const [isOpen, setIsOpen] = useState(false); // Start collapsed to reduce scrolling
  const [acknowledging, setAcknowledging] = useState(false);

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

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    const { error } = await acknowledgeSop(sopId);
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to acknowledge",
        description: error.message,
      });
    } else {
      toast({
        title: "SOP Acknowledged",
        description: "Your acknowledgment has been recorded.",
      });
      onAckSuccess?.();
    }
    setAcknowledging(false);
  };

  return (
    <Card className={`transition-all ${isAcknowledged ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/10' : 'border-border'}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isAcknowledged && (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
              <CardTitle className="text-base font-medium truncate">
                {itemNumber !== undefined && (
                  <span className="text-muted-foreground font-mono mr-2">SOP-{String(itemNumber).padStart(3, '0')}</span>
                )}
                {title}
              </CardTitle>
              {source === "org" ? (
                <Badge variant="secondary" className="text-xs flex-shrink-0">✏️ Custom</Badge>
              ) : (
                <Badge variant="outline" className="text-xs flex-shrink-0">🛡️ System</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {canEdit && onEdit && (
                <Button size="sm" variant="ghost" onClick={onEdit} className="text-muted-foreground hover:text-primary">
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {ackRequired && !isAcknowledged && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleAcknowledge}
                  disabled={acknowledging}
                  className="text-xs"
                >
                  <FileCheck className="h-3 w-3 mr-1" />
                  {acknowledging ? "..." : "Acknowledge"}
                </Button>
              )}
              {isAcknowledged && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  ✓ Acknowledged
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={onStartQuiz}>
                <Play className="h-3 w-3 mr-1" />
                Quiz
              </Button>
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
            <div className="mt-2 text-xs text-muted-foreground">
              Version {version} • Epoch {ackEpoch}
            </div>
            <div className="mt-4 pt-4 border-t flex gap-2">
              {ackRequired && !isAcknowledged && (
                <Button 
                  onClick={handleAcknowledge} 
                  disabled={acknowledging}
                  variant="secondary"
                  className="flex-1"
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  {acknowledging ? "Acknowledging..." : "Acknowledge SOP"}
                </Button>
              )}
              <Button onClick={onStartQuiz} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                {t("quiz.takeQuiz")} (2 {t("quiz.questions")})
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default SOPCard;
