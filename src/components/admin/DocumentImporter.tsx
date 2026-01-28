import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrgSops } from "@/hooks/useOrgSops";

interface ProcessedDocument {
  title: string;
  content: string;
  summary: string;
  type: string;
}

type ContentType = "sop" | "policy" | "training" | "safety" | "disciplinary";

const contentTypeLabels: Record<ContentType, string> = {
  sop: "Standard Operating Procedure (SOP)",
  policy: "Company Policy",
  training: "Training Material",
  safety: "Safety Protocol",
  disciplinary: "Disciplinary Procedure",
};

const contentTypeIcons: Record<ContentType, string> = {
  sop: "📋",
  policy: "📜",
  training: "📚",
  safety: "🦺",
  disciplinary: "⚖️",
};

const DocumentImporter = () => {
  const { toast } = useToast();
  const { createOrgSop, refresh } = useOrgSops();
  
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [contentType, setContentType] = useState<ContentType>("sop");
  const [processing, setProcessing] = useState(false);
  const [processedDoc, setProcessedDoc] = useState<ProcessedDocument | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);

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
    // Note: Full PDF/DOCX parsing would require additional libraries
    if (fileName.endsWith(".pdf")) {
      // Basic text extraction attempt
      const text = await file.text();
      // If it looks like binary, inform user
      if (text.includes("%PDF")) {
        throw new Error(
          "PDF detected. Please copy and paste the text content directly, or use Google Drive integration for automatic extraction."
        );
      }
      return text;
    }

    // For other files, try text extraction
    return await file.text();
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
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("process-document", {
        body: {
          documentText: textContent,
          contentType,
          fileName,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Processing failed");
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Processing failed");
      }

      const processed = response.data.data as ProcessedDocument;
      setProcessedDoc(processed);
      setEditedTitle(processed.title);
      setEditedContent(processed.content);

      toast({
        title: "Document processed!",
        description: `"${processed.title}" is ready for review`,
      });
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
      // Add compliance footer for org SOPs
      const complianceFooter = "\n\n---\n⚠️ This content has been imported and customized by the organization. The organization is responsible for ensuring compliance with applicable laws and regulations.";
      const contentWithFooter = editedContent.trim() + complianceFooter;

      const { error } = await createOrgSop(editedTitle.trim(), contentWithFooter);

      if (error) {
        throw error;
      }

      await refresh();

      toast({
        title: "Content saved!",
        description: `"${editedTitle}" has been added to your organization's ${contentTypeLabels[contentType]}s`,
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

  const handleReset = () => {
    setFile(null);
    setPastedText("");
    setProcessedDoc(null);
    setEditedTitle("");
    setEditedContent("");
  };

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
            Upload or paste existing documents and let AI format them for your employee manual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Content Type Selection */}
          <div className="space-y-2">
            <Label>Content Type</Label>
            <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(contentTypeLabels) as ContentType[]).map((type) => (
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

          {/* Input Mode Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={inputMode === "file" ? "default" : "outline"}
              onClick={() => setInputMode("file")}
              className="flex-1"
            >
              <FileUp className="h-4 w-4 mr-2" />
              Upload File
            </Button>
            <Button
              type="button"
              variant={inputMode === "paste" ? "default" : "outline"}
              onClick={() => setInputMode("paste")}
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
                  Processing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Process with AI
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
        </CardContent>
      </Card>

      {/* Preview & Edit Card */}
      {processedDoc && (
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
                  Save to Organization {contentTypeLabels[contentType]}s
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
