import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDocumentBuilder, DocumentType } from "@/hooks/useDocumentBuilder";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DOCUMENT_TYPES: { value: DocumentType; label: string; icon: React.ElementType; description: string }[] = [
  { value: "sop", label: "SOP", icon: FileText, description: "Standard Operating Procedure" },
  { value: "policy", label: "Policy", icon: BookOpen, description: "Company Policy" },
  { value: "safety", label: "Safety", icon: Shield, description: "Safety Protocol" },
  { value: "training", label: "Training", icon: GraduationCap, description: "Training Requirement" },
  { value: "disciplinary", label: "Disciplinary", icon: Scale, description: "Disciplinary Procedure" },
];

const STARTER_PROMPTS = [
  "Create an SOP for interior painting preparation",
  "Write a safety protocol for working at heights",
  "Draft a policy for equipment maintenance",
  "Create training requirements for new painters",
];

const DocumentBuilder = () => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isLoading,
    documentType,
    setDocumentType,
    sendMessage,
    clearChat,
    extractMarkdownContent,
  } = useDocumentBuilder();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const selectedType = DOCUMENT_TYPES.find((d) => d.value === documentType);
  const TypeIcon = selectedType?.icon || FileText;

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

          {messages.length > 0 && (
            <>
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

      {/* Chat Area */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="max-w-md text-center">
                <h3 className="text-lg font-semibold">Start Building Your Document</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Describe what you need and I'll help you create a professional{" "}
                  {selectedType?.description.toLowerCase()}.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="h-auto whitespace-normal text-left"
                    onClick={() => handleStarterPrompt(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
                      "max-w-[85%] rounded-lg px-4 py-3",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Describe the ${selectedType?.description.toLowerCase()} you need...`}
              className="min-h-[60px] flex-1 resize-none"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" className="h-[60px] w-[60px]" disabled={!input.trim() || isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            AI-generated content. Always review before use.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default DocumentBuilder;
