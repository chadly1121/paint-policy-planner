import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Send,
  Trash2,
  Copy,
  Check,
  FileText,
  Shield,
  BookOpen,
  GraduationCap,
  Scale,
  Sparkles,
  Loader2,
  Save,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDocumentBuilder, DocumentType } from "@/hooks/useDocumentBuilder";
import { DocumentPreview } from "@/components/document-builder/DocumentPreview";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DOCUMENT_TYPES: { value: DocumentType; label: string; icon: React.ElementType; description: string }[] = [
  { value: "sop", label: "SOP", icon: FileText, description: "Standard Operating Procedure" },
  { value: "policy", label: "Policy", icon: BookOpen, description: "Company Policy" },
  { value: "safety", label: "Safety", icon: Shield, description: "Safety Protocol" },
  { value: "training", label: "Training", icon: GraduationCap, description: "Training Requirement" },
  { value: "disciplinary", label: "Disciplinary", icon: Scale, description: "Disciplinary Procedure" },
];

const STARTER_PROMPTS: Record<DocumentType, string[]> = {
  sop: [
    "Create an SOP for interior painting preparation",
    "Write procedures for spray equipment setup and cleanup",
    "Draft an SOP for color matching and mixing",
    "Create a checklist for job site walkthroughs",
  ],
  policy: [
    "Draft a policy for equipment usage and maintenance",
    "Write a cell phone and personal device policy",
    "Create a customer communication standards policy",
    "Draft a uniform and dress code policy",
  ],
  safety: [
    "Write a safety protocol for working at heights",
    "Create PPE requirements for spray painting",
    "Draft a ladder safety and inspection protocol",
    "Write procedures for handling chemical spills",
  ],
  training: [
    "Create training requirements for new painters",
    "Write onboarding checklist for field employees",
    "Draft OSHA compliance training requirements",
    "Create a mentorship program structure",
  ],
  disciplinary: [
    "Write a disciplinary procedure for attendance violations",
    "Create a progressive discipline policy",
    "Draft procedures for safety violation consequences",
    "Write a performance improvement plan template",
  ],
};

const DocumentBuilder = () => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isLoading,
    isSaving,
    documentType,
    setDocumentType,
    sendMessage,
    clearChat,
    extractMarkdownContent,
    saveToDrive,
  } = useDocumentBuilder();
  const [lastSavedDoc, setLastSavedDoc] = useState<{ web_view_link: string; file_name: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopy = async () => {
    const content = extractMarkdownContent();
    if (!content) {
      toast.error("No document content to copy");
      return;
    }
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Content copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStarterPrompt = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const handleSaveToDrive = async () => {
    const result = await saveToDrive();
    if (result?.web_view_link) {
      setLastSavedDoc({ web_view_link: result.web_view_link, file_name: result.file_name });
      window.open(result.web_view_link, '_blank');
    }
  };

  const selectedType = DOCUMENT_TYPES.find((d) => d.value === documentType);
  const TypeIcon = selectedType?.icon || FileText;

  // Get the latest assistant message for the document preview
  const latestAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const hasDocument = !!latestAssistantMessage;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold">Document Builder</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered assistant to create professional documents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={documentType} onValueChange={(val) => setDocumentType(val as DocumentType)}>
            <SelectTrigger className="w-[180px]">
              <TypeIcon className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <type.icon className="h-4 w-4" />
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasDocument && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveToDrive}
                disabled={isSaving}
                title="Save to Google Drive"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save to Drive
              </Button>
              <Button variant="outline" size="icon" onClick={handleCopy} title="Copy content">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={clearChat} title="Clear chat">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Chat Panel */}
        <Card className={cn(
          "flex flex-col overflow-hidden transition-all duration-300",
          hasDocument ? "w-1/3 min-w-[320px]" : "flex-1"
        )}>
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Chat</span>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="max-w-sm text-center">
                  <h3 className="text-base font-semibold">Start Building</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Describe what you need and I'll create a professional {selectedType?.description.toLowerCase()}.
                  </p>
                </div>
                <div className="grid gap-2 w-full">
                  {STARTER_PROMPTS[documentType].map((prompt) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      size="sm"
                      className="h-auto whitespace-normal text-left text-xs"
                      onClick={() => handleStarterPrompt(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {msg.role === "user" ? (
                        <p>{msg.content}</p>
                      ) : (
                        <p className="text-xs italic">Document generated ✓</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs text-muted-foreground">Generating...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-3">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasDocument ? "Ask for changes..." : `Describe the ${selectedType?.description.toLowerCase()}...`}
                className="min-h-[50px] flex-1 resize-none text-sm"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" className="h-[50px] w-[50px]" disabled={!input.trim() || isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </Card>

        {/* Document Preview Panel */}
        {hasDocument && (
          <Card className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Document Preview</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {selectedType?.description}
              </span>
            </div>
            <ScrollArea className="flex-1">
              <DocumentPreview
                content={latestAssistantMessage?.content || ""}
                isStreaming={isLoading && messages[messages.length - 1]?.role === "assistant"}
                className="m-4 min-h-[calc(100%-2rem)]"
              />
            </ScrollArea>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DocumentBuilder;
