// Drive-based document list component
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search, RefreshCw, Loader2, FolderOpen } from "lucide-react";
import { useDriveFiles, type DriveFile } from "@/hooks/useDriveFiles";
import { DriveDocumentCard } from "./DriveDocumentCard";
import { useDriveConnection } from "@/hooks/useDriveConnection";
import { useSectionItemProgress } from "@/hooks/useSectionItemProgress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DriveDocumentListProps {
  moduleType: "sops" | "policies" | "safety" | "training" | "disciplinary" | "forms";
  icon: React.ReactNode;
  title: string;
  description: string;
  onStartQuiz?: (file: DriveFile, content: string) => void;
}

export function DriveDocumentList({
  moduleType,
  icon,
  title,
  description,
  onStartQuiz,
}: DriveDocumentListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const { files, loading, error, refresh } = useDriveFiles(moduleType);
  const { folders } = useDriveConnection();
  const { isItemCompleted, refreshProgress, getCompletedItemCount } = useSectionItemProgress(moduleType);
  const [syncing, setSyncing] = useState(false);

  // Get folder info for "Open in Drive" link
  const folderRecord = folders.find(f => f.folder_type === moduleType);

  // Filter files by search query and exclude templates from display
  const filteredFiles = useMemo(() => {
    const nonTemplateFiles = files.filter(file => !file.name.startsWith('_TEMPLATE'));
    if (!searchQuery.trim()) return nonTemplateFiles;
    const query = searchQuery.toLowerCase();
    return nonTemplateFiles.filter(file =>
      file.name.toLowerCase().includes(query)
    );
  }, [files, searchQuery]);

  // Calculate progress based on completed quizzes
  const completedCount = getCompletedItemCount();
  const totalCount = filteredFiles.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleRefresh = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const syncResponse = await supabase.functions.invoke("drive-sync", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: { module_type: moduleType },
        });

        if (syncResponse.error) throw syncResponse.error;
        const result = syncResponse.data?.results?.[0];
        if (result) {
          toast({
            title: "Folder synced",
            description: `${result.files_found} file(s) • ${result.records_created} new • ${result.records_updated} updated${result.records_marked_removed ? ` • ${result.records_marked_removed} removed` : ''}`,
          });
        }
      }
    } catch (err) {
      console.error("Drive sync error:", err);
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
    await refresh();
    await refreshProgress();
    setSyncing(false);
  };

  const openInDrive = () => {
    if (folderRecord?.drive_folder_id) {
      window.open(`https://drive.google.com/drive/folders/${folderRecord.drive_folder_id}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-8 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 overflow-hidden">
      {/* Header Card */}
      <Card className="border-primary/20 w-full min-w-0">
        <CardHeader className="pb-4">
          {/* Header: stack on mobile, row on tablet+ */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                {icon}
              </div>
              <div className="min-w-0">
                <CardTitle className="font-serif truncate">{title}</CardTitle>
                <CardDescription className="line-clamp-2">{description}</CardDescription>
              </div>
            </div>
            {/* Buttons: wrap on small screens */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={syncing}
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-2">Refresh</span>
              </Button>
              {folderRecord && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openInDrive}
                >
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Open Folder</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quiz Progress</span>
              <span className="font-medium">{completedCount} / {totalCount} completed</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {files.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload .docx files to this folder in Google Drive, then click Refresh.
            </p>
            {folderRecord && (
              <Button variant="outline" onClick={openInDrive}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Open Folder
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document List */}
      <div className="space-y-3">
        {filteredFiles.map((file, index) => (
          <DriveDocumentCard
            key={file.id}
            file={file}
            itemNumber={index + 1}
            moduleType={moduleType}
            isQuizCompleted={isItemCompleted(file.id)}
            onStartQuiz={onStartQuiz ? () => onStartQuiz(file, '') : undefined}
          />
        ))}
      </div>

      {/* No results */}
      {searchQuery && filteredFiles.length === 0 && files.length > 0 && (
        <p className="text-center text-muted-foreground py-8">
          {t("common.noResults")} "{searchQuery}"
        </p>
      )}
    </div>
  );
}
