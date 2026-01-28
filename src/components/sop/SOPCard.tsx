import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, ChevronDown, ChevronUp, Play, Pencil, FileCheck, EyeOff, Video, Download, FileText } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOrgSops } from "@/hooks/useOrgSops";
import { useToast } from "@/hooks/use-toast";
import VideoEmbed from "@/components/video/VideoEmbed";
import { supabase } from "@/integrations/supabase/client";

interface SOPCardProps {
  sopId: string;
  title: string;
  content: string;
  videoUrl?: string | null;
  sourceFileUrl?: string | null;
  source: string;
  systemKey: string | null;
  isAcknowledged: boolean;
  ackRequired: boolean;
  version: number;
  ackEpoch: number;
  canEdit: boolean;
  canEditSystem: boolean;
  canHideSystem: boolean;
  itemNumber?: number;
  onStartQuiz: () => void;
  onEdit?: () => void;
  onEditSystem?: () => void;
  onAckSuccess?: () => void;
}

const SOPCard = ({ 
  sopId, 
  title, 
  content, 
  videoUrl,
  sourceFileUrl,
  source,
  systemKey,
  isAcknowledged, 
  ackRequired,
  version,
  ackEpoch,
  canEdit,
  canEditSystem,
  canHideSystem,
  itemNumber,
  onStartQuiz, 
  onEdit,
  onEditSystem,
  onAckSuccess
}: SOPCardProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { acknowledgeSop, hideSystemSop } = useOrgSops();
  const [isOpen, setIsOpen] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [showHideDialog, setShowHideDialog] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Download original file from storage
  const handleDownloadOriginal = async () => {
    if (!sourceFileUrl) return;
    
    setDownloading(true);
    try {
      // sourceFileUrl is the full path in storage, extract the path after the bucket
      // Format: org_{org_id}/filename.docx
      const { data, error } = await supabase.storage
        .from("org-documents")
        .createSignedUrl(sourceFileUrl, 60); // 60 seconds expiry
      
      if (error) throw error;
      
      // Open download link in new tab
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = sourceFileUrl.split('/').pop() || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: "Your original document is downloading.",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error instanceof Error ? error.message : "Could not download file",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Enhanced content formatting for both system and uploaded content
  const formattedContent = content.split('\n').map((line, idx) => {
    const trimmedLine = line.trim();
    
    // Markdown H2 headers (## Header)
    if (trimmedLine.startsWith('## ')) {
      return <h3 key={idx} className="font-semibold mt-4 mb-2 text-primary text-base">{trimmedLine.substring(3)}</h3>;
    }
    // Markdown H3 headers (### Header)
    if (trimmedLine.startsWith('### ')) {
      return <h4 key={idx} className="font-semibold mt-3 mb-1 text-primary text-sm">{trimmedLine.substring(4)}</h4>;
    }
    // Markdown H1 headers (# Header) - treat like H2 for consistency
    if (trimmedLine.startsWith('# ') && !trimmedLine.startsWith('## ')) {
      return <h3 key={idx} className="font-semibold mt-4 mb-2 text-primary text-base">{trimmedLine.substring(2)}</h3>;
    }
    // Bullet points (• or * or -)
    if (trimmedLine.startsWith('•') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
      const bulletContent = trimmedLine.startsWith('•') 
        ? trimmedLine.substring(1).trim() 
        : trimmedLine.substring(2).trim();
      return (
        <li key={idx} className="ml-4 text-muted-foreground flex items-start gap-2">
          <span className="text-primary mt-1.5">•</span>
          <span>{formatInlineText(bulletContent)}</span>
        </li>
      );
    }
    // Numbered lists (1. item)
    if (trimmedLine.match(/^\d+\.\s/)) {
      const numberMatch = trimmedLine.match(/^(\d+)\.\s(.*)$/);
      if (numberMatch) {
        return (
          <li key={idx} className="ml-4 text-muted-foreground flex items-start gap-2">
            <span className="text-primary font-medium min-w-[1.5rem]">{numberMatch[1]}.</span>
            <span>{formatInlineText(numberMatch[2])}</span>
          </li>
        );
      }
    }
    // Empty lines
    if (trimmedLine === '') {
      return <br key={idx} />;
    }
    // Horizontal rules
    if (trimmedLine.startsWith('---')) {
      return <hr key={idx} className="my-3 border-border" />;
    }
    // Warning text
    if (trimmedLine.startsWith('⚠️')) {
      return <p key={idx} className="text-amber-600 dark:text-amber-400 text-sm font-medium mt-2">{trimmedLine}</p>;
    }
    // ALL CAPS headers (legacy system style)
    if (trimmedLine.toUpperCase() === trimmedLine && trimmedLine.length > 3 && /^[A-Z\s]+$/.test(trimmedLine)) {
      return <h4 key={idx} className="font-semibold mt-3 mb-1 text-primary">{trimmedLine}</h4>;
    }
    // Bold text lines (**text**)
    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      return <p key={idx} className="font-semibold text-foreground mb-1">{trimmedLine.slice(2, -2)}</p>;
    }
    // Regular paragraph
    return <p key={idx} className="mb-1 text-muted-foreground">{formatInlineText(trimmedLine)}</p>;
  });

  // Helper function to format inline markdown (bold, etc.)
  function formatInlineText(text: string): React.ReactNode {
    // Handle **bold** text within lines
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    if (parts.length === 1) return text;
    
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-foreground font-medium">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  }

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

  const handleHideSystem = async () => {
    if (!systemKey) return;
    setHiding(true);
    const { error } = await hideSystemSop(systemKey);
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to hide SOP",
        description: error.message,
      });
    } else {
      toast({
        title: "SOP Hidden",
        description: "This system SOP has been hidden from your organization.",
      });
      onAckSuccess?.();
    }
    setHiding(false);
    setShowHideDialog(false);
  };

  return (
    <>
      <AlertDialog open={showHideDialog} onOpenChange={setShowHideDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hide System SOP?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will hide the system SOP <strong>"{title}"</strong> from all users in your organization.
              </p>
              <p className="text-amber-600 dark:text-amber-400">
                ⚠️ <strong>Important:</strong> If you have a custom SOP that replaces this content, hiding the system version prevents conflicts or duplicates.
              </p>
              <p>
                You can restore hidden SOPs from the Admin settings at any time.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleHideSystem} disabled={hiding}>
              {hiding ? "Hiding..." : "Hide SOP"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
              {videoUrl && (
                <Badge variant="outline" className="text-xs flex-shrink-0 border-blue-500/50 text-blue-600 dark:text-blue-400">
                  <Video className="h-3 w-3 mr-1" />
                  Video
                </Badge>
              )}
              {sourceFileUrl && (
                <Badge variant="outline" className="text-xs flex-shrink-0 border-primary/50 text-primary">
                  <FileText className="h-3 w-3 mr-1" />
                  Original
                </Badge>
              )}
              {source === "org" ? (
                <Badge variant="secondary" className="text-xs flex-shrink-0">✏️ Custom</Badge>
              ) : (
                <Badge variant="outline" className="text-xs flex-shrink-0">🛡️ System</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Edit button for org SOPs */}
              {canEdit && onEdit && source === "org" && (
                <Button size="sm" variant="ghost" onClick={onEdit} className="text-muted-foreground hover:text-primary">
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {/* Edit button for system SOPs - creates a custom fork */}
              {canEditSystem && onEditSystem && source === "system" && (
                <Button size="sm" variant="ghost" onClick={onEditSystem} className="text-muted-foreground hover:text-primary" title="Customize this SOP">
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {/* Hide button for system SOPs */}
              {canHideSystem && source === "system" && systemKey && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowHideDialog(true)} 
                  className="text-muted-foreground hover:text-destructive" 
                  title="Hide this system SOP"
                >
                  <EyeOff className="h-3 w-3" />
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
            {videoUrl && (
              <VideoEmbed url={videoUrl} title={title} />
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
              {formattedContent}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Version {version} • Epoch {ackEpoch}
            </div>
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
              {/* Download original file button */}
              {sourceFileUrl && (
                <Button 
                  onClick={handleDownloadOriginal} 
                  disabled={downloading}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloading ? "Downloading..." : "Download Original"}
                </Button>
              )}
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
    </>
  );
};

export default SOPCard;
