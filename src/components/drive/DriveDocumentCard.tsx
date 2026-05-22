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
  Languages,
  Video,
  Settings2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDriveContent } from "@/hooks/useDriveContent";
import { useTranslatedTitle } from "@/hooks/useTranslatedTitle";
import { useDriveFileMetadata } from "@/hooks/useDriveFileMetadata";
import { useAuth } from "@/contexts/AuthContext";
import VideoEmbed from "@/components/video/VideoEmbed";
import { VideoUrlDialog } from "./VideoUrlDialog";
import type { DriveFile } from "@/hooks/useDriveFiles";
import { DocReferenceText } from "@/components/docref/DocReferenceText";
import { RelatedDocumentsPanel } from "@/components/docref/RelatedDocumentsPanel";
import { extractRelationships, docIdFromFilename } from "@/lib/documentRelationships";
import { useSyncAutoRelationships } from "@/hooks/useDocumentRelationships";
import { useOrganization } from "@/hooks/useOrganization";
import { useDriveParsedSections } from "@/hooks/useDriveParsedSections";
import { NonNegotiablesCallout } from "./NonNegotiablesCallout";

interface DriveDocumentCardProps {
  file: DriveFile;
  itemNumber: number;
  moduleType: "sops" | "policies" | "safety" | "training" | "disciplinary" | "forms";
  isAcknowledged?: boolean;
  isQuizCompleted?: boolean;
  ackRequired?: boolean;
  onAcknowledge?: () => void;
  onStartQuiz?: () => void;
}

export function DriveDocumentCard({
  file,
  itemNumber,
  moduleType,
  isAcknowledged = false,
  isQuizCompleted = false,
  ackRequired = false,
  onAcknowledge,
  onStartQuiz,
}: DriveDocumentCardProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { fetchDriveContent, clearCache, currentLanguage } = useDriveContent();
  const { videoUrl, updateVideoUrl } = useDriveFileMetadata(file.id);
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [contentLanguage, setContentLanguage] = useState<string | null>(null);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);

  // Get display title (remove file extension) and translate it
  const originalTitle = file.name.replace(/\.[^/.]+$/, '');
  const { translatedTitle: displayTitle, loading: titleLoading } = useTranslatedTitle(originalTitle);

  // Self doc id (ROP-XXX-###) parsed from filename — used to look up relationships.
  const selfDocId = docIdFromFilename(file.name);
  const { org } = useOrganization();
  const syncAuto = useSyncAutoRelationships();
  const { data: parsedSections } = useDriveParsedSections(file.id, moduleType, selfDocId);
  const nonNegotiables = Array.isArray(parsedSections?.non_negotiables)
    ? parsedSections!.non_negotiables!.filter((s) => typeof s === "string" && s.trim().length > 0)
    : [];

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

        // Auto-extract relationships from "Related Procedures" / "Suggested next documents"
        // sections and upsert them. RLS restricts writes to admins; failure is silent.
        if (isAdmin && selfDocId && org?.id) {
          const { relationships } = extractRelationships(translatedContent);
          if (relationships.length > 0) {
            try {
              await syncAuto.mutateAsync({
                org_id: org.id,
                from_doc_id_external: selfDocId,
                extracted: relationships,
              });
            } catch (_e) {
              // non-fatal
            }
          }
        }
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
    // Strip "Related Procedures and Documents" / "Suggested next documents" sections —
    // those are surfaced via the RelatedDocumentsPanel instead.
    const { bodyLines } = extractRelationships(text);
    return bodyLines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={idx} />;
      if (trimmed.startsWith('## ')) {
        return <h3 key={idx} className="font-semibold mt-4 mb-2 text-primary"><DocReferenceText text={trimmed.substring(3)} /></h3>;
      }
      if (trimmed.startsWith('# ')) {
        return <h2 key={idx} className="font-bold mt-4 mb-2 text-primary text-lg"><DocReferenceText text={trimmed.substring(2)} /></h2>;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        return (
          <li key={idx} className="ml-4 text-muted-foreground flex items-start gap-2">
            <span className="text-primary mt-1.5">•</span>
            <span><DocReferenceText text={trimmed.substring(2)} /></span>
          </li>
        );
      }
      return <p key={idx} className="mb-1 text-muted-foreground"><DocReferenceText text={trimmed} /></p>;
    });
  };

  // Determine card styling based on completion status
  const isCompleted = isQuizCompleted || isAcknowledged;
  
  return (
    <Card className={`transition-all ${isCompleted ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/20' : 'border-border'}`}>
      <Collapsible open={isOpen} onOpenChange={handleToggle}>
        <CardHeader className="pb-2">
          {/* Row 1: Title - full width */}
          <div className="flex items-start gap-2 mb-2">
            {isCompleted && (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            <CardTitle className="text-base font-medium leading-snug">
              <span className="text-muted-foreground font-mono mr-2">
                {prefix}-{String(itemNumber).padStart(3, '0')}
              </span>
              {displayTitle}
            </CardTitle>
          </div>
          
          {/* Row 2: Badges and actions */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {videoUrl && (
                <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-600 dark:text-blue-400">
                  <Video className="h-3 w-3 mr-1" />
                  Video
                </Badge>
              )}
              <Badge variant="outline" className="text-xs border-sky-500/50 text-sky-600 dark:text-sky-400">
                <FileText className="h-3 w-3 mr-1" />
                Drive
              </Badge>
              {isAcknowledged && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  ✓ Acknowledged
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Video URL edit button (admin only) */}
              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoDialogOpen(true);
                  }}
                  title={videoUrl ? "Edit video" : "Add video"}
                  className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
                >
                  <Video className="h-3.5 w-3.5" />
                </Button>
              )}
              
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
                  className="h-8 w-8 p-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}
              
              {/* Acknowledge button */}
              {ackRequired && !isAcknowledged && onAcknowledge && (
                <Button size="sm" variant="outline" onClick={onAcknowledge} className="text-xs h-8">
                  <FileCheck className="h-3 w-3 mr-1" />
                  Ack
                </Button>
              )}
              
              {/* Quiz button */}
              {onStartQuiz && (
                <Button size="sm" variant="outline" onClick={onStartQuiz} className="h-8">
                  <Play className="h-3 w-3 mr-1" />
                  Quiz
                </Button>
              )}
              
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Video embed */}
            {videoUrl && (
              <VideoEmbed url={videoUrl} title={displayTitle} />
            )}
            
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

            {/* Related Documents (managed via document_relationships, not body text) */}
            {!loadingContent && <RelatedDocumentsPanel fromDocIdExternal={selfDocId} />}
            
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

      {/* Video URL Dialog */}
      <VideoUrlDialog
        open={videoDialogOpen}
        onOpenChange={setVideoDialogOpen}
        currentUrl={videoUrl}
        documentName={displayTitle}
        onSave={updateVideoUrl}
      />
    </Card>
  );
}
