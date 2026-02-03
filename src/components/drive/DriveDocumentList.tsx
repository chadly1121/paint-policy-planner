// Drive-based document list component
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search, RefreshCw, Loader2, FolderOpen, Plus, FilePlus } from "lucide-react";
import { useDriveFiles, type DriveFile } from "@/hooks/useDriveFiles";
import { DriveDocumentCard } from "./DriveDocumentCard";
import { useDriveConnection } from "@/hooks/useDriveConnection";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateDriveDocumentDialog, type DriveFolderType } from "./CreateDriveDocumentDialog";

interface DriveDocumentListProps {
  moduleType: "sops" | "policies" | "safety" | "training" | "disciplinary";
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
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { files, loading, error, refresh } = useDriveFiles(moduleType);
  const { folders } = useDriveConnection();
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

  // Calculate progress (placeholder - would need acknowledgment data)
  const progressPercent = 0; // TODO: Connect to acknowledgment tracking

  const handleRefresh = async () => {
    setSyncing(true);
    await refresh();
    setSyncing(false);
  };

  const openInDrive = () => {
    if (folderRecord?.drive_folder_id) {
      window.open(`https://drive.google.com/drive/folders/${folderRecord.drive_folder_id}`, '_blank');
    }
  };

  // Create new doc using backend function (copies template server-side + auto-names)
  const createNewFromTemplate = async (folderType: DriveFolderType) => {
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("drive-create-from-template", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          folder_type: folderType,
        },
      });

      if (response.error) throw response.error;

      const fromTemplate = response.data.from_template ? " (from template)" : "";
      const createdName = response.data.file_name ?? "New document";
      toast({
        title: "Document created",
        description: `"${createdName}" created${fromTemplate}`,
      });

      // Open in new tab for editing
      if (response.data.web_view_link) {
        window.open(response.data.web_view_link, "_blank");
      }

      // Refresh the file list
      await refresh();
    } catch (err) {
      console.error("Create error:", err);
      toast({
        variant: "destructive",
        title: "Failed to create document",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsCreating(false);
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
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                {icon}
              </div>
              <div className="flex-1">
                <CardTitle className="font-serif">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                disabled={isCreating}
                className="gap-2"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FilePlus className="h-4 w-4" />
                )}
                {isCreating ? "Creating..." : "Create New"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={syncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {folderRecord && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openInDrive}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Open Folder
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Documents in Drive</span>
              <span className="font-medium">{filteredFiles.length} files</span>
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
              Add documents to your {title} folder in Google Drive.
            </p>
            {folderRecord && (
              <Button onClick={openInDrive}>
                <Plus className="h-4 w-4 mr-2" />
                Add Documents in Drive
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

      <CreateDriveDocumentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultFolderType={moduleType as DriveFolderType}
        isCreating={isCreating}
        onCreate={createNewFromTemplate}
      />
    </div>
  );
}
