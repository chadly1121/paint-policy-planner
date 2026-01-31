import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  Check, 
  AlertCircle,
  RefreshCw,
  Save,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  FolderOpen,
  Plus,
  ExternalLink,
  FileUp,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrgSops } from "@/hooks/useOrgSops";
import { useOrg } from "@/contexts/OrganizationContext";
import { useDriveConnection } from "@/hooks/useDriveConnection";

interface ImportedFile {
  id: string;
  source_file_id: string;
  file_name: string;
  drive_file_id: string;
  web_view_link: string | null;
  was_converted: boolean;
  original_file_id: string | null;
  module_type: string;
  status: "pending" | "importing" | "imported" | "saving" | "saved" | "error";
  editedTitle?: string;
  error?: string;
}

type ModuleType = "sop" | "policy" | "training" | "safety" | "disciplinary";

const moduleTypeLabels: Record<ModuleType, string> = {
  sop: "Standard Operating Procedure (SOP)",
  policy: "Company Policy",
  training: "Training Material",
  safety: "Safety Protocol",
  disciplinary: "Disciplinary Procedure",
};

const moduleTypeIcons: Record<ModuleType, string> = {
  sop: "📋",
  policy: "📜",
  training: "📚",
  safety: "🦺",
  disciplinary: "⚖️",
};

// Map module types to folder types
const moduleFolderMap: Record<ModuleType, string> = {
  sop: "sops",
  policy: "policies", 
  training: "training",
  safety: "safety",
  disciplinary: "disciplinary",
};

const DocumentImporter = () => {
  const { toast } = useToast();
  const { org } = useOrg();
  const { createOrgSop, refresh: refreshSops } = useOrgSops();
  const { isConnected, hasFolders } = useDriveConnection();
  
  const [moduleType, setModuleType] = useState<ModuleType>("sop");
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");

  // Load Google Picker API
  const loadPickerApi = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google?.picker) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        window.gapi?.load("picker", () => resolve());
      };
      script.onerror = () => reject(new Error("Failed to load Google Picker API"));
      document.head.appendChild(script);
    });
  };

  // Get picker access token via GIS
  const getPickerAccessToken = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        reject(new Error("Google Client ID not configured"));
        return;
      }

      const tokenClient = window.google?.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error));
          } else if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error("No access token received"));
          }
        },
      });

      if (!tokenClient) {
        reject(new Error("Failed to initialize token client"));
        return;
      }

      tokenClient.requestAccessToken({ prompt: "" });
    });
  };

  const handleImportFromDrive = async () => {
    if (!isConnected || !hasFolders) {
      toast({
        variant: "destructive",
        title: "Drive not connected",
        description: "Please connect Google Drive and create folder structure first.",
      });
      return;
    }

    setIsPickerLoading(true);

    try {
      await loadPickerApi();
      const accessToken = await getPickerAccessToken();

      if (!window.google?.picker) {
        throw new Error("Google Picker not loaded");
      }

      const picker = new window.google.picker.PickerBuilder()
        .addView(
          new window.google.picker.DocsView()
            .setIncludeFolders(false)
            .setSelectFolderEnabled(false)
            .setMimeTypes(
              "application/vnd.google-apps.document," +
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
              "application/msword," +
              "application/pdf," +
              "text/plain"
            )
        )
        .setOAuthToken(accessToken)
        .setCallback(handlePickerCallback)
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .setTitle("Select documents to import")
        .build();

      picker.setVisible(true);
    } catch (error) {
      console.error("Picker error:", error);
      toast({
        variant: "destructive",
        title: "Failed to open file picker",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsPickerLoading(false);
    }
  };

  const handlePickerCallback = async (data: google.picker.PickerResponse) => {
    if (data.action !== "picked") return;

    const selectedDocs = data.docs || [];
    if (selectedDocs.length === 0) return;

    // Add files to the import queue
    const newFiles: ImportedFile[] = selectedDocs.map((doc) => ({
      id: `${doc.id}-${Date.now()}`,
      source_file_id: doc.id,
      file_name: doc.name,
      drive_file_id: "",
      web_view_link: null,
      was_converted: false,
      original_file_id: null,
      module_type: moduleType,
      status: "pending" as const,
      editedTitle: doc.name.replace(/\.(docx?|pdf|txt|md)$/i, ""),
    }));

    setImportedFiles((prev) => [...prev, ...newFiles]);

    // Process each file
    for (const file of newFiles) {
      await processImportFile(file);
    }
  };

  const processImportFile = async (file: ImportedFile) => {
    setImportedFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, status: "importing" as const } : f))
    );

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("drive-import", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          source_file_id: file.source_file_id,
          target_folder_type: moduleFolderMap[moduleType],
          new_name: file.editedTitle,
          module_type: moduleType,
        },
      });

      if (response.error) throw response.error;

      setImportedFiles((prev) =>
        prev.map((f) =>
          f.id === file.id
            ? {
                ...f,
                status: "imported" as const,
                drive_file_id: response.data.file_id,
                web_view_link: response.data.web_view_link,
                was_converted: response.data.was_converted,
                original_file_id: response.data.original_file_id,
                editedTitle: response.data.file_name,
              }
            : f
        )
      );

      toast({
        title: "File imported",
        description: `"${response.data.file_name}" copied to your ${moduleType.toUpperCase()} folder${response.data.was_converted ? " (converted to Google Doc)" : ""}`,
      });
    } catch (error) {
      console.error("Import error:", error);
      setImportedFiles((prev) =>
        prev.map((f) =>
          f.id === file.id
            ? {
                ...f,
                status: "error" as const,
                error: error instanceof Error ? error.message : "Import failed",
              }
            : f
        )
      );
    }
  };

  const handleCreateNewDoc = async () => {
    if (!newDocTitle.trim()) {
      toast({
        variant: "destructive",
        title: "Title required",
        description: "Please enter a title for the new document",
      });
      return;
    }

    setIsCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("drive-create-test-doc", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          title: newDocTitle,
          content: `# ${newDocTitle}\n\n_Start writing your ${moduleTypeLabels[moduleType]} here..._`,
          folder_type: moduleFolderMap[moduleType],
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Document created",
        description: `"${newDocTitle}" created in Google Drive`,
      });

      // Add to imported files list
      setImportedFiles((prev) => [
        {
          id: `new-${Date.now()}`,
          source_file_id: response.data.file_id,
          file_name: newDocTitle,
          drive_file_id: response.data.file_id,
          web_view_link: response.data.web_view_link,
          was_converted: false,
          original_file_id: null,
          module_type: moduleType,
          status: "imported" as const,
          editedTitle: newDocTitle,
        },
        ...prev,
      ]);

      setNewDocTitle("");
    } catch (error) {
      console.error("Create error:", error);
      toast({
        variant: "destructive",
        title: "Failed to create document",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveToDatabase = async (file: ImportedFile) => {
    if (!file.drive_file_id) {
      toast({
        variant: "destructive",
        title: "No file ID",
        description: "File must be imported to Drive first",
      });
      return;
    }

    setImportedFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, status: "saving" as const } : f))
    );

    try {
      // For SOPs, create the database record with drive_file_id as source_file_url
      if (file.module_type === "sop") {
        // Store the web_view_link as the source_file_url so admins can access the doc
        const result = await createOrgSop(
          file.editedTitle || file.file_name,
          `_This document is stored in Google Drive._\n\n[Open in Google Docs](${file.web_view_link || '#'})`,
          file.web_view_link || undefined
        );

        if (result.error) throw result.error;
        await refreshSops();
      }

      setImportedFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, status: "saved" as const } : f))
      );

      toast({
        title: "Saved to database",
        description: `"${file.editedTitle}" registered as ${moduleTypeLabels[file.module_type as ModuleType]}`,
      });
    } catch (error) {
      console.error("Save error:", error);
      setImportedFiles((prev) =>
        prev.map((f) =>
          f.id === file.id
            ? { ...f, status: "error" as const, error: "Failed to save" }
            : f
        )
      );
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleSaveAll = async () => {
    const importedNotSaved = importedFiles.filter((f) => f.status === "imported");
    for (const file of importedNotSaved) {
      await handleSaveToDatabase(file);
    }
  };

  const removeFile = (id: string) => {
    setImportedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileTitle = (id: string, title: string) => {
    setImportedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, editedTitle: title } : f))
    );
  };

  const importedCount = importedFiles.filter((f) => f.status === "imported").length;
  const savedCount = importedFiles.filter((f) => f.status === "saved").length;
  const errorCount = importedFiles.filter((f) => f.status === "error").length;
  const pendingCount = importedFiles.filter((f) => f.status === "pending" || f.status === "importing").length;

  // Show connection requirement
  if (!isConnected || !hasFolders) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Document Importer
          </CardTitle>
          <CardDescription>
            Import or create SOPs as Google Docs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!isConnected 
                ? "Please connect your Google Drive account in the Drive tab before importing documents."
                : "Please create the folder structure in the Drive tab before importing documents."
              }
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Import Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Document Importer
          </CardTitle>
          <CardDescription>
            Import or create SOPs as Google Docs. Files are stored in Google Drive and synced automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Module Type Selection */}
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={moduleType} onValueChange={(v) => setModuleType(v as ModuleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(moduleTypeLabels) as ModuleType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    <span className="flex items-center gap-2">
                      <span>{moduleTypeIcons[type]}</span>
                      <span>{moduleTypeLabels[type]}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Primary Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Import from Drive */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-primary" />
                <h4 className="font-medium">Import from Google Drive</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Select existing documents from your Drive. DOCX/PDF files will be converted to Google Docs.
              </p>
              <Button 
                onClick={handleImportFromDrive} 
                disabled={isPickerLoading}
                className="w-full"
              >
                {isPickerLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Opening Picker...
                  </>
                ) : (
                  <>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Select from Drive
                  </>
                )}
              </Button>
            </div>

            {/* Create New */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                <h4 className="font-medium">Create New {moduleType.toUpperCase()}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Create a blank Google Doc in your organization's folder.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Document title..."
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateNewDoc()}
                />
                <Button 
                  onClick={handleCreateNewDoc} 
                  disabled={isCreating || !newDocTitle.trim()}
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Info Notice */}
          <Alert className="border-info bg-info/10">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Google Docs are the recommended format. DOCX/PDF files will be converted on import, with originals kept as reference.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Imported Files List */}
      {importedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Imported Documents</CardTitle>
              <div className="flex gap-2 text-xs">
                {pendingCount > 0 && (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {pendingCount} processing
                  </Badge>
                )}
                {importedCount > 0 && (
                  <Badge variant="secondary">
                    <Check className="h-3 w-3 mr-1" />
                    {importedCount} ready
                  </Badge>
                )}
                {savedCount > 0 && (
                  <Badge variant="default" className="bg-success text-success-foreground">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {savedCount} saved
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {errorCount} errors
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {importedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      file.status === "saved"
                        ? "bg-success/10 border-success/30"
                        : file.status === "imported"
                        ? "bg-primary/10 border-primary/30"
                        : file.status === "error"
                        ? "bg-destructive/10 border-destructive/30"
                        : file.status === "importing" || file.status === "saving"
                        ? "bg-warning/10 border-warning/30"
                        : "bg-muted/30"
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="shrink-0">
                      {(file.status === "pending" || file.status === "importing" || file.status === "saving") && (
                        <Loader2 className="h-5 w-5 text-warning animate-spin" />
                      )}
                      {file.status === "imported" && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                      {file.status === "saved" && (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      )}
                      {file.status === "error" && (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      {file.status === "imported" ? (
                        <Input
                          value={file.editedTitle || ""}
                          onChange={(e) => updateFileTitle(file.id, e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Document title"
                        />
                      ) : (
                        <p className="font-medium text-sm truncate">{file.editedTitle || file.file_name}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {moduleTypeIcons[file.module_type as ModuleType]} {file.module_type.toUpperCase()}
                        </Badge>
                        {file.was_converted && (
                          <Badge variant="secondary" className="text-xs">
                            Converted
                          </Badge>
                        )}
                        {file.error && (
                          <span className="text-xs text-destructive">{file.error}</span>
                        )}
                        {file.status === "saved" && (
                          <span className="text-xs text-success">Saved to database</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {file.web_view_link && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(file.web_view_link!, "_blank")}
                          title="Open in Google Docs"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      {file.status === "imported" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveToDatabase(file)}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      )}
                      {file.status !== "saving" && file.status !== "importing" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Bulk Actions */}
            {importedCount > 0 && (
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={handleSaveAll} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save All ({importedCount})
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setImportedFiles([])}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentImporter;
