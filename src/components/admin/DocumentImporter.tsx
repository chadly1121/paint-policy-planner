import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
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
  Upload, 
  FileText, 
  Loader2, 
  Sparkles, 
  Check, 
  AlertTriangle,
  FileUp,
  Clipboard,
  RefreshCw,
  Save,
  X,
  Files,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrgSops } from "@/hooks/useOrgSops";
import { useCompanyContent, ContentType as CompanyContentType } from "@/hooks/useCompanyContent";
import { useOrg } from "@/contexts/OrganizationContext";

interface ProcessedDocument {
  title: string;
  content: string;
  summary: string;
  type: string;
  autoDetected?: boolean;
  sourceFileUrl?: string;
}

interface BulkFileItem {
  id: string;
  file: File;
  status: "pending" | "processing" | "processed" | "error" | "saved";
  processedDoc?: ProcessedDocument;
  editedTitle?: string;
  editedContent?: string;
  detectedType?: ContentType;
  error?: string;
}

type ContentType = "sop" | "policy" | "training" | "safety" | "disciplinary" | "auto";

const contentTypeLabels: Record<ContentType, string> = {
  auto: "🤖 Auto-Detect (AI determines type)",
  sop: "Standard Operating Procedure (SOP)",
  policy: "Company Policy",
  training: "Training Material",
  safety: "Safety Protocol",
  disciplinary: "Disciplinary Procedure",
};

const contentTypeIcons: Record<ContentType, string> = {
  auto: "🤖",
  sop: "📋",
  policy: "📜",
  training: "📚",
  safety: "🦺",
  disciplinary: "⚖️",
};

type FormatMode = "ai" | "original";

const DocumentImporter = () => {
  const { toast } = useToast();
  const { org } = useOrg();
  const { createOrgSop, refresh: refreshSops } = useOrgSops();
  const { 
    upsertCompanyPolicy, 
    upsertCompanyTrainingContent, 
    upsertCompanySafetyContent, 
    upsertCompanyDisciplinaryContent,
    refreshContent 
  } = useCompanyContent();
  
  // Mode: single or bulk
  const [uploadMode, setUploadMode] = useState<"single" | "bulk">("single");
  
  // Single mode state
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [contentType, setContentType] = useState<ContentType>("sop");
  const [formatMode, setFormatMode] = useState<FormatMode>("original");
  const [processing, setProcessing] = useState(false);
  const [processedDoc, setProcessedDoc] = useState<ProcessedDocument | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Bulk mode state
  const [bulkFiles, setBulkFiles] = useState<BulkFileItem[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkSaving, setBulkSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Maximum file size is 10MB",
        });
        return;
      }
      setFile(selectedFile);
      setProcessedDoc(null);
    }
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles: BulkFileItem[] = [];
    const errors: string[] = [];

    Array.from(selectedFiles).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name} is too large (max 10MB)`);
        return;
      }
      newFiles.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        status: "pending",
      });
    });

    if (errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Some files skipped",
        description: errors.join(", "),
      });
    }

    setBulkFiles((prev) => [...prev, ...newFiles]);
  };

  const removeBulkFile = (id: string) => {
    setBulkFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // Text-based files
    if (
      fileType.includes("text") ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md") ||
      fileName.endsWith(".csv")
    ) {
      return await file.text();
    }

    // For PDF, DOCX, etc. - read as text (basic extraction)
    if (fileName.endsWith(".pdf")) {
      const text = await file.text();
      if (text.includes("%PDF")) {
        throw new Error(
          "PDF binary detected. Please use text files or paste content directly."
        );
      }
      return text;
    }

    return await file.text();
  };

  const processFileWithAI = async (textContent: string, fileName: string, overrideType?: ContentType): Promise<ProcessedDocument> => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("Not authenticated");
    }

    const typeToUse = overrideType || contentType;
    const isAutoDetect = typeToUse === "auto";

    const response = await supabase.functions.invoke("process-document", {
      body: {
        documentText: textContent,
        contentType: isAutoDetect ? null : typeToUse,
        fileName,
        autoDetect: isAutoDetect,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || "Processing failed");
    }

    if (!response.data?.success) {
      throw new Error(response.data?.error || "Processing failed");
    }

    return response.data.data as ProcessedDocument;
  };

  // Extract title from filename (remove extension and clean up)
  const extractTitleFromFilename = (filename: string): string => {
    // Remove file extension
    const withoutExt = filename.replace(/\.[^/.]+$/, "");
    // Remove common prefixes like PD-20200627-01 - 
    const cleanedTitle = withoutExt.replace(/^[A-Z]{1,3}-\d+-\d+\s*-\s*/i, "");
    return cleanedTitle.trim() || withoutExt;
  };

  // Upload original file to storage
  const uploadOriginalFile = async (fileToUpload: File): Promise<string | null> => {
    if (!org?.id) {
      console.error("No org ID available for file upload");
      return null;
    }

    try {
      const fileExt = fileToUpload.name.split('.').pop() || 'bin';
      const timestamp = Date.now();
      const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `org_${org.id}/uploads/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('org-documents')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error("File upload error:", uploadError);
        throw uploadError;
      }

      // Get the public URL for the file
      const { data: urlData } = supabase.storage
        .from('org-documents')
        .getPublicUrl(filePath);

      console.log("File uploaded successfully:", filePath);
      return urlData?.publicUrl || filePath;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  };

  const handleProcess = async () => {
    let textContent = "";
    let fileName = "";

    if (inputMode === "file") {
      if (!file) {
        toast({
          variant: "destructive",
          title: "No file selected",
          description: "Please select a file to import",
        });
        return;
      }
      
      try {
        textContent = await extractTextFromFile(file);
        fileName = file.name;
      } catch (error) {
        toast({
          variant: "destructive",
          title: "File read error",
          description: error instanceof Error ? error.message : "Could not read file",
        });
        return;
      }
    } else {
      if (!pastedText.trim()) {
        toast({
          variant: "destructive",
          title: "No content",
          description: "Please paste some text content to import",
        });
        return;
      }
      textContent = pastedText;
      fileName = "pasted-content";
    }

    if (textContent.length < 50) {
      toast({
        variant: "destructive",
        title: "Content too short",
        description: "Please provide more content (at least 50 characters)",
      });
      return;
    }

    setProcessing(true);
    setProcessedDoc(null);

    try {
      // If "original" format mode, skip AI processing entirely
      if (formatMode === "original") {
        // In "Keep Original" mode, immediately create the SOP/content (no separate Save step)
        const extractedTitle = extractTitleFromFilename(fileName);
        const processed: ProcessedDocument = {
          title: extractedTitle,
          content: textContent, // Keep exact original content
          summary: "Imported with original formatting preserved",
          type: contentType === "auto" ? "sop" : contentType,
          autoDetected: false,
        };

        let sourceFileUrl: string | undefined;

        // Upload original file when provided
        if (inputMode === "file" && file) {
          toast({
            title: "Uploading file...",
            description: "Storing original document",
          });
          const uploaded = await uploadOriginalFile(file);
          if (uploaded) {
            sourceFileUrl = uploaded;
          } else {
            // Still create the SOP even if storage upload fails, but warn the user
            toast({
              variant: "destructive",
              title: "File upload failed",
              description: "Creating the SOP without storing the original file.",
            });
          }
        }

        const typeForSave = processed.type as ContentType;
        const saveError = await saveContent(processed.title, processed.content, typeForSave, sourceFileUrl);
        if (saveError) throw saveError;

        if (typeForSave === "sop") {
          await refreshSops();
        } else {
          await refreshContent();
        }

        const savedTypeLabel = contentTypeLabels[typeForSave] || typeForSave;
        const fileStoredMsg = sourceFileUrl ? " Original file stored in Drive." : "";
        toast({
          title: "Content created!",
          description: `"${processed.title}" has been added to your ${savedTypeLabel}.${fileStoredMsg}`,
        });

        // Reset form
        setFile(null);
        setPastedText("");
        setProcessedDoc(null);
        setEditedTitle("");
        setEditedContent("");
      } else {
        // AI processing mode
        const processed = await processFileWithAI(textContent, fileName);
        setProcessedDoc(processed);
        setEditedTitle(processed.title);
        setEditedContent(processed.content);

        toast({
          title: "Document processed!",
          description: `"${processed.title}" is ready for review`,
        });
      }
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        variant: "destructive",
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkProcess = async () => {
    const pendingFiles = bulkFiles.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "No files to process",
        description: "Add files to process first",
      });
      return;
    }

    setBulkProcessing(true);
    setBulkProgress(0);

    const total = pendingFiles.length;
    let completed = 0;

    for (const fileItem of pendingFiles) {
      // Update status to processing
      setBulkFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id ? { ...f, status: "processing" as const } : f
        )
      );

      try {
        const textContent = await extractTextFromFile(fileItem.file);
        
        if (textContent.length < 50) {
          throw new Error("Content too short (min 50 characters)");
        }

        const processed = await processFileWithAI(textContent, fileItem.file.name, "auto");
        const detectedType = (processed.type || "sop") as ContentType;

        setBulkFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: "processed" as const,
                  processedDoc: processed,
                  editedTitle: processed.title,
                  editedContent: processed.content,
                  detectedType: detectedType,
                }
              : f
          )
        );
      } catch (error) {
        console.error(`Error processing ${fileItem.file.name}:`, error);
        setBulkFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Unknown error",
                }
              : f
          )
        );
      }

      completed++;
      setBulkProgress(Math.round((completed / total) * 100));
    }

    setBulkProcessing(false);

    const successCount = bulkFiles.filter((f) => f.status === "processed").length + 
                        pendingFiles.filter((_, i) => i < completed).filter((f) => 
                          bulkFiles.find((b) => b.id === f.id)?.status === "processed"
                        ).length;
    
    toast({
      title: "Bulk processing complete",
      description: `${completed} files processed`,
    });
  };

  const saveContent = async (
    title: string, 
    content: string, 
    typeOverride?: ContentType,
    sourceFileUrl?: string
  ): Promise<Error | null> => {
    const complianceFooter = "\n\n---\n⚠️ This content has been imported and customized by the organization. The organization is responsible for ensuring compliance with applicable laws and regulations.";
    const contentWithFooter = content.trim() + complianceFooter;
    const sourceKey = `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    let error: Error | null = null;
    const typeToSave = typeOverride || (contentType === "auto" ? "sop" : contentType);

    switch (typeToSave) {
      case "sop":
        const sopResult = await createOrgSop(title.trim(), contentWithFooter, sourceFileUrl);
        error = sopResult.error;
        break;
      case "policy":
        const policyResult = await upsertCompanyPolicy(sourceKey, title.trim(), contentWithFooter);
        error = policyResult.error as Error | null;
        break;
      case "training":
        const trainingResult = await upsertCompanyTrainingContent(sourceKey, title.trim(), contentWithFooter);
        error = trainingResult.error as Error | null;
        break;
      case "safety":
        const safetyResult = await upsertCompanySafetyContent(sourceKey, title.trim(), contentWithFooter);
        error = safetyResult.error as Error | null;
        break;
      case "disciplinary":
        const disciplinaryResult = await upsertCompanyDisciplinaryContent(sourceKey, title.trim(), contentWithFooter);
        error = disciplinaryResult.error as Error | null;
        break;
    }

    return error;
  };

  const handleSave = async () => {
    if (!editedTitle.trim() || !editedContent.trim()) {
      toast({
        variant: "destructive",
        title: "Missing content",
        description: "Title and content are required",
      });
      return;
    }

    setSaving(true);

    try {
      let sourceFileUrl: string | undefined;

      // Upload original file to storage if in "Keep Original" mode and we have a file
      if (formatMode === "original" && file && inputMode === "file") {
        toast({
          title: "Uploading file...",
          description: "Storing original document",
        });
        sourceFileUrl = (await uploadOriginalFile(file)) || undefined;
      }

      const typeForSave = processedDoc?.type as ContentType || (contentType === "auto" ? "sop" : contentType);
      const error = await saveContent(editedTitle, editedContent, typeForSave, sourceFileUrl);

      if (error) {
        throw error;
      }

      const savedType = processedDoc?.type as ContentType || (contentType === "auto" ? "sop" : contentType);
      if (savedType === "sop") {
        await refreshSops();
      } else {
        await refreshContent();
      }

      const savedTypeLabel = contentTypeLabels[savedType] || savedType;
      const fileStoredMsg = sourceFileUrl ? " Original file stored in Drive." : "";
      toast({
        title: "Content saved!",
        description: `"${editedTitle}" has been added to your ${savedTypeLabel}.${fileStoredMsg}`,
      });

      // Reset form
      setFile(null);
      setPastedText("");
      setProcessedDoc(null);
      setEditedTitle("");
      setEditedContent("");
    } catch (error) {
      console.error("Save error:", error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSave = async () => {
    const processedFiles = bulkFiles.filter((f) => f.status === "processed");
    if (processedFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "No files to save",
        description: "Process files first before saving",
      });
      return;
    }

    setBulkSaving(true);
    let savedCount = 0;
    let errorCount = 0;
    const savedTypes = new Set<string>();

    for (const fileItem of processedFiles) {
      if (!fileItem.editedTitle || !fileItem.editedContent) continue;

      try {
        // Use the detected type for this specific file
        const typeForFile = fileItem.detectedType || "sop";
        const error = await saveContent(fileItem.editedTitle, fileItem.editedContent, typeForFile);
        if (error) throw error;

        savedTypes.add(typeForFile);
        setBulkFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id ? { ...f, status: "saved" as const } : f
          )
        );
        savedCount++;
      } catch (error) {
        console.error(`Error saving ${fileItem.editedTitle}:`, error);
        errorCount++;
      }
    }

    // Refresh data for all saved types
    if (savedTypes.has("sop")) {
      await refreshSops();
    }
    if (savedTypes.has("policy") || savedTypes.has("training") || savedTypes.has("safety") || savedTypes.has("disciplinary")) {
      await refreshContent();
    }

    setBulkSaving(false);

    toast({
      title: "Bulk save complete",
      description: `${savedCount} saved, ${errorCount} errors`,
    });
  };

  const handleReset = () => {
    setFile(null);
    setPastedText("");
    setProcessedDoc(null);
    setEditedTitle("");
    setEditedContent("");
  };

  const handleBulkReset = () => {
    setBulkFiles([]);
    setBulkProgress(0);
  };

  const updateBulkFileTitle = (id: string, title: string) => {
    setBulkFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, editedTitle: title } : f))
    );
  };

  const processedCount = bulkFiles.filter((f) => f.status === "processed").length;
  const savedCount = bulkFiles.filter((f) => f.status === "saved").length;
  const errorCount = bulkFiles.filter((f) => f.status === "error").length;
  const pendingCount = bulkFiles.filter((f) => f.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Import Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Document Importer
          </CardTitle>
          <CardDescription>
            Upload or paste existing documents and let AI format them for your training portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Mode Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={uploadMode === "single" ? "default" : "outline"}
              onClick={() => setUploadMode("single")}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Single File
            </Button>
            <Button
              type="button"
              variant={uploadMode === "bulk" ? "default" : "outline"}
              onClick={() => setUploadMode("bulk")}
              className="flex-1"
            >
              <Files className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
          </div>

          {/* Content Type Selection */}
          <div className="space-y-2">
            <Label>Content Type</Label>
            <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(contentTypeLabels) as ContentType[]).filter(t => formatMode === "ai" || t !== "auto").map((type) => (
                  <SelectItem key={type} value={type}>
                    <span className="flex items-center gap-2">
                      <span>{contentTypeIcons[type]}</span>
                      <span>{contentTypeLabels[type]}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Format Mode Selection */}
          <div className="space-y-2">
            <Label>Formatting Mode</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formatMode === "original" ? "secondary" : "ghost"}
                onClick={() => {
                  setFormatMode("original");
                  if (contentType === "auto") setContentType("sop");
                }}
                size="sm"
                className="flex-1"
              >
                <HardDrive className="h-4 w-4 mr-2" />
                Keep Original
              </Button>
              <Button
                type="button"
                variant={formatMode === "ai" ? "secondary" : "ghost"}
                onClick={() => setFormatMode("ai")}
                size="sm"
                className="flex-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Format
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatMode === "original" 
                ? "Document saved exactly as uploaded. Original file stored in SOPed Drive for reference." 
                : "AI will reformat and structure the document according to best practices"}
            </p>
          </div>

          {/* SINGLE MODE */}
          {uploadMode === "single" && (
            <>
              {/* Input Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={inputMode === "file" ? "secondary" : "ghost"}
                  onClick={() => setInputMode("file")}
                  size="sm"
                  className="flex-1"
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
                <Button
                  type="button"
                  variant={inputMode === "paste" ? "secondary" : "ghost"}
                  onClick={() => setInputMode("paste")}
                  size="sm"
                  className="flex-1"
                >
                  <Clipboard className="h-4 w-4 mr-2" />
                  Paste Text
                </Button>
              </div>

              {/* File Upload */}
              {inputMode === "file" && (
                <div className="space-y-2">
                  <Label>Select File</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".txt,.md,.pdf,.doc,.docx,.csv"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {file ? (
                        <div className="flex items-center justify-center gap-2 text-primary">
                          <FileText className="h-8 w-8" />
                          <div className="text-left">
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          <Upload className="h-8 w-8 mx-auto mb-2" />
                          <p>Click to upload or drag and drop</p>
                          <p className="text-sm">TXT, MD, PDF, DOC, DOCX (max 10MB)</p>
                        </div>
                      )}
                    </label>
                  </div>
                  <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                      For best results with PDF/DOCX files, copy and paste the text content directly using the "Paste Text" option.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Paste Text */}
              {inputMode === "paste" && (
                <div className="space-y-2">
                  <Label>Paste Content</Label>
                  <Textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste your document content here..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-sm text-muted-foreground">
                    {pastedText.length} characters
                  </p>
                </div>
              )}

              {/* Process Button */}
              <div className="flex gap-2">
                <Button
                  onClick={handleProcess}
                  disabled={processing || (inputMode === "file" && !file) || (inputMode === "paste" && !pastedText.trim())}
                  className="flex-1"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {formatMode === "original" ? "Preparing..." : "Processing with AI..."}
                    </>
                  ) : (
                    <>
                      {formatMode === "original" ? (
                        <>
                          <HardDrive className="h-4 w-4 mr-2" />
                          Process & Keep Original
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Process with AI
                        </>
                      )}
                    </>
                  )}
                </Button>
                {(file || pastedText || processedDoc) && (
                  <Button variant="outline" onClick={handleReset}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                )}
              </div>
            </>
          )}

          {/* BULK MODE */}
          {uploadMode === "bulk" && (
            <>
              {/* Bulk File Upload */}
              <div className="space-y-2">
                <Label>Select Multiple Files</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="bulk-file-upload"
                    className="hidden"
                    accept=".txt,.md,.pdf,.doc,.docx,.csv"
                    multiple
                    onChange={handleBulkFileChange}
                  />
                  <label htmlFor="bulk-file-upload" className="cursor-pointer">
                    <div className="text-muted-foreground">
                      <Files className="h-8 w-8 mx-auto mb-2" />
                      <p>Click to select multiple files</p>
                      <p className="text-sm">TXT, MD, PDF, DOC, DOCX (max 10MB each)</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* File List */}
              {bulkFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Files ({bulkFiles.length})</Label>
                    <div className="flex gap-2 text-xs">
                      {pendingCount > 0 && (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {pendingCount} pending
                        </Badge>
                      )}
                      {processedCount > 0 && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          <Check className="h-3 w-3 mr-1" />
                          {processedCount} processed
                        </Badge>
                      )}
                      {savedCount > 0 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
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

                  <ScrollArea className="h-[300px] border rounded-lg">
                    <div className="p-3 space-y-2">
                      {bulkFiles.map((fileItem) => (
                        <div
                          key={fileItem.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            fileItem.status === "saved"
                              ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
                              : fileItem.status === "processed"
                              ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
                              : fileItem.status === "error"
                              ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                              : fileItem.status === "processing"
                              ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                              : "bg-muted/30"
                          }`}
                        >
                          {/* Status Icon */}
                          <div className="shrink-0">
                            {fileItem.status === "pending" && (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                            {fileItem.status === "processing" && (
                              <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
                            )}
                            {fileItem.status === "processed" && (
                              <Check className="h-5 w-5 text-blue-600" />
                            )}
                            {fileItem.status === "saved" && (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            )}
                            {fileItem.status === "error" && (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            {fileItem.status === "processed" || fileItem.status === "saved" ? (
                              <Input
                                value={fileItem.editedTitle || ""}
                                onChange={(e) => updateBulkFileTitle(fileItem.id, e.target.value)}
                                className="h-8 text-sm"
                                placeholder="Document title"
                                disabled={fileItem.status === "saved"}
                              />
                            ) : (
                              <p className="font-medium text-sm truncate">{fileItem.file.name}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {(fileItem.status === "processed" || fileItem.status === "saved") && fileItem.detectedType && (
                                <Badge variant="outline" className="text-xs">
                                  {contentTypeIcons[fileItem.detectedType]} {fileItem.detectedType.toUpperCase()}
                                </Badge>
                              )}
                              <p className="text-xs text-muted-foreground truncate">
                                {fileItem.error || (
                                  fileItem.status === "saved" 
                                    ? "Saved successfully" 
                                    : fileItem.status === "processed"
                                    ? fileItem.processedDoc?.summary?.slice(0, 50) + "..."
                                    : `${(fileItem.file.size / 1024).toFixed(1)} KB`
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Remove Button */}
                          {fileItem.status !== "saved" && fileItem.status !== "processing" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 h-8 w-8"
                              onClick={() => removeBulkFile(fileItem.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Progress Bar */}
                  {bulkProcessing && (
                    <div className="space-y-2">
                      <Progress value={bulkProgress} className="h-2" />
                      <p className="text-sm text-center text-muted-foreground">
                        Processing... {bulkProgress}%
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Bulk Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleBulkProcess}
                  disabled={bulkProcessing || pendingCount === 0}
                  className="flex-1"
                >
                  {bulkProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Process All ({pendingCount})
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleBulkSave}
                  disabled={bulkSaving || processedCount === 0}
                  variant="secondary"
                  className="flex-1"
                >
                  {bulkSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save All ({processedCount})
                    </>
                  )}
                </Button>
                {bulkFiles.length > 0 && (
                  <Button variant="outline" onClick={handleBulkReset}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                  For best results, use plain text (.txt) or markdown (.md) files. PDF and DOCX files may not extract properly.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* Preview & Edit Card (Single Mode Only) */}
      {uploadMode === "single" && processedDoc && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Review & Edit
            </CardTitle>
            <CardDescription>
              Review the AI-formatted content and make any adjustments before saving
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <Alert>
              <AlertDescription>
                <strong>AI Summary:</strong> {processedDoc.summary}
              </AlertDescription>
            </Alert>

            {/* Title */}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label>Content (Markdown)</Label>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />
            </div>

            {/* Compliance Notice */}
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Auto-appended compliance notice:</p>
              <p className="italic">
                "This content has been imported and customized by the organization. The organization is responsible for ensuring compliance."
              </p>
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save to {contentTypeLabels[contentType]}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentImporter;
