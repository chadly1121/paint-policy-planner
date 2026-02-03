// Drive-based SOP Card component - displays a file from Google Drive with translation support
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronUp, 
  Play, 
  ExternalLink, 
  FileText, 
  Loader2,
  Download,
  CheckCircle2,
  FileCheck,
  Languages
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDriveContent } from "@/hooks/useDriveContent";
import { useTranslatedTitle } from "@/hooks/useTranslatedTitle";
import type { DriveFile } from "@/hooks/useDriveFiles";

interface DriveDocumentCardProps {
  file: DriveFile;
  itemNumber: number;
  moduleType: "sops" | "policies" | "safety" | "training" | "disciplinary";
  isAcknowledged?: boolean;
  ackRequired?: boolean;
  onAcknowledge?: () => void;
  onStartQuiz?: () => void;
}

export function DriveDocumentCard({
  file,
  itemNumber,
  moduleType,
  isAcknowledged = false,
  ackRequired = false,
  onAcknowledge,
  onStartQuiz,
}: DriveDocumentCardProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { fetchDriveContent, clearCache, currentLanguage } = useDriveContent();
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [contentLanguage, setContentLanguage] = useState<string | null>(null);

  // Get display title (remove file extension) and translate it
  const originalTitle = file.name.replace(/\.[^/.]+$/, '');
  const { translatedTitle: displayTitle, loading: titleLoading } = useTranslatedTitle(originalTitle);

  // Module prefix for numbering
  const prefixMap = {
    sops: "SOP",
    policies: "POL",
    safety: "SAFETY",
    training: "TRAIN",
    disciplinary: "DISC",
  };
  const prefix = prefixMap[moduleType];

  // Re-fetch content when language changes and card is open
  useEffect(() => {
    if (isOpen && contentLanguage && contentLanguage !== currentLanguage) {
      // Language changed while open - clear cached content and re-fetch
      clearCache(file.id);
      setContent(null);
      setContentLanguage(null);
      loadContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage]);

  // Load content from Drive with translation
  const loadContent = async () => {
    setLoadingContent(true);
    try {
      const translatedContent = await fetchDriveContent(file.id, { translate: true });
      if (translatedContent) {
        setContent(translatedContent);
        setContentLanguage(currentLanguage);
      }
    } catch (err) {
      console.error("Error loading content:", err);
      toast({
        variant: "destructive",
        title: "Failed to load content",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoadingContent(false);
    }
  };

  // Load content from Drive when expanded
  const handleToggle = async (open: boolean) => {
    setIsOpen(open);
    
    if (open && (!content || contentLanguage !== currentLanguage) && !loadingContent) {
      await loadContent();
    }
  };

  // Download as DOCX
  const handleDownload = async (format: "docx" | "pdf") => {
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("drive-export", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { file_id: file.id, format },
      });

      if (response.error) throw response.error;
      if (!response.data?.content_base64) throw new Error("No file content received");

      // Convert base64 to blob and download
      const byteCharacters = atob(response.data.content_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { 
        type: format === "docx" 
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf"
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = response.data.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: `${response.data.file_name} is downloading.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Format content for display
  const formatContent = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={idx} />;
      if (trimmed.startsWith('## ')) {
        return <h3 key={idx} className="font-semibold mt-4 mb-2 text-primary">{trimmed.substring(3)}</h3>;
      }
      if (trimmed.startsWith('# ')) {
        return <h2 key={idx} className="font-bold mt-4 mb-2 text-primary text-lg">{trimmed.substring(2)}</h2>;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        return (
          <li key={idx} className="ml-4 text-muted-foreground flex items-start gap-2">
            <span className="text-primary mt-1.5">•</span>
            <span>{trimmed.substring(2)}</span>
          </li>
        );
      }
      return <p key={idx} className="mb-1 text-muted-foreground">{trimmed}</p>;
    });
  };

  return (
    <Card className={`transition-all ${isAcknowledged ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/10' : 'border-border'}`}>
      <Collapsible open={isOpen} onOpenChange={handleToggle}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isAcknowledged && (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
              <CardTitle className="text-base font-medium truncate">
                <span className="text-muted-foreground font-mono mr-2">
                  {prefix}-{String(itemNumber).padStart(3, '0')}
                </span>
                {displayTitle}
              </CardTitle>
              <Badge variant="outline" className="text-xs flex-shrink-0 border-sky-500/50 text-sky-600 dark:text-sky-400">
                <FileText className="h-3 w-3 mr-1" />
                Drive
              </Badge>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Open in Drive */}
              {file.webViewLink && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(file.webViewLink, '_blank');
                  }}
                  title="Open in Google Drive"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
              
              {/* Acknowledge button */}
              {ackRequired && !isAcknowledged && onAcknowledge && (
                <Button size="sm" variant="outline" onClick={onAcknowledge} className="text-xs">
                  <FileCheck className="h-3 w-3 mr-1" />
                  Acknowledge
                </Button>
              )}
              
              {isAcknowledged && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  ✓ Acknowledged
                </Badge>
              )}
              
              {/* Quiz button */}
              {onStartQuiz && (
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
            {/* Loading state */}
            {loadingContent && (
              <div className="flex items-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <Languages className="h-4 w-4" />
                <span>{currentLanguage !== 'en' ? t("common.translating") : t("common.loading")}...</span>
              </div>
            )}
            
            {/* Content */}
            {!loadingContent && content && (
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                {formatContent(content)}
              </div>
            )}
            
            {/* Metadata */}
            <div className="mt-4 text-xs text-muted-foreground flex items-center gap-4">
              <span>Modified: {new Date(file.modifiedTime).toLocaleDateString()}</span>
              {file.size && <span>Size: {Math.round(parseInt(file.size) / 1024)} KB</span>}
            </div>
            
            {/* Actions */}
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload("docx")}
                disabled={downloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? "Downloading..." : "Download DOCX"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload("pdf")}
                disabled={downloading}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              {file.webViewLink && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(file.webViewLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Edit in Drive
                </Button>
              )}
              {onStartQuiz && (
                <Button onClick={onStartQuiz} size="sm" className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  {t("quiz.takeQuiz")}
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
