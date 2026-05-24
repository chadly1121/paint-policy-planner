// Document Assistant - AI chat component that uses org's OpenAI key
// Works across all sections: SOPs, Policies, Safety, Training, Disciplinary
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Bot, 
  Send, 
  Loader2, 
  User, 
  ExternalLink,
  AlertTriangle,
  FileText,
  Settings
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import i18n from "@/i18n";
import ReactMarkdown from "react-markdown";
import { DocReferenceText } from "@/components/docref/DocReferenceText";
import { DOC_REF_REGEX, useDocRegistry } from "@/hooks/useDocRegistry";
import { useDocPreview } from "@/contexts/DocPreviewContext";

// Citation badge. If the title contains a ROP-XXX-### code that resolves in the
// registry, clicking opens the preview drawer; otherwise it renders as plain text
// (no Drive link, matching the staff-safe permissions policy).
function CitationBadge({ title, fileId }: { title: string; fileId: string }) {
  const { data: registry } = useDocRegistry();
  const { openDoc } = useDocPreview();
  const match = title.match(DOC_REF_REGEX);
  const docId = match?.[0]?.toUpperCase();
  const entry = docId ? registry?.get(docId) : undefined;
  if (entry) {
    return (
      <button
        type="button"
        onClick={() => openDoc(entry.doc_id_external)}
        className="inline-flex"
      >
        <Badge variant="secondary" className="text-[10px] py-0 px-1 hover:bg-secondary/80 cursor-pointer">
          {title}
        </Badge>
      </button>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] py-0 px-1 text-muted-foreground">
      {title}
    </Badge>
  );
}

// Walk markdown children and linkify any plain-string nodes so doc refs
// like "ROP-POL-003" become clickable Links with tooltips.
const linkifyChildren = (children: React.ReactNode): React.ReactNode => {
  if (typeof children === "string") return <DocReferenceText text={children} />;
  if (Array.isArray(children)) {
    return children.map((c, i) =>
      typeof c === "string" ? <DocReferenceText key={i} text={c} /> : c
    );
  }
  return children;
};

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p>{linkifyChildren(children)}</p>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{linkifyChildren(children)}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong>{linkifyChildren(children)}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em>{linkifyChildren(children)}</em>,
};

interface Message {
  role: "user" | "assistant";
  content: string;
  citedDocs?: { title: string; fileId: string; webViewLink: string }[];
}

interface DocumentAssistantProps {
  suggestions?: string[];
}

export function DocumentAssistant({ suggestions = [] }: DocumentAssistantProps = {}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { org } = useOrganization();
  const { isAdmin } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiConnected, setAiConnected] = useState<boolean | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (org?.id) {
      checkAIConnection();
    }
  }, [org?.id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const checkAIConnection = async () => {
    if (!org?.id) return;
    
    setCheckingConnection(true);
    try {
      const { data, error } = await supabase
        .from("org_ai_settings")
        .select("id, is_active")
        .eq("org_id", org.id)
        .eq("provider", "openai")
        .eq("is_active", true)
        .single();

      setAiConnected(!error && !!data);
    } catch (error) {
      setAiConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("sop-assistant", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { 
          messages: [...messages, userMessage].map(m => ({ 
            role: m.role, 
            content: m.content 
          })),
          targetLanguage: i18n.language,
        },
      });

      if (response.error) throw response.error;

      if (response.data?.error === "AI_NOT_CONNECTED") {
        setAiConnected(false);
        toast({
          variant: "destructive",
          title: "AI Not Connected",
          description: "Ask your admin to connect an AI provider.",
        });
        return;
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: response.data.message,
        citedDocs: response.data.citedDocs,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Document Assistant error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      
      if (errorMessage.includes("RATE_LIMIT") || errorMessage.includes("429")) {
        toast({
          variant: "destructive",
          title: "Rate Limit",
          description: "Too many requests. Please wait a moment.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage,
        });
      }
      
      // Remove the user message if there was an error
      setMessages((prev) => prev.slice(0, -1));
      setInput(userMessage.content);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (checkingConnection) {
    return (
      <Card className="h-[200px]">
        <CardContent className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!aiConnected) {
    return (
      <Card className="h-[200px]">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <Alert className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">AI Required</AlertTitle>
            <AlertDescription className="space-y-2 text-xs">
              <p>Connect your AI provider to enable the assistant.</p>
              {isAdmin ? (
                <Link to="/admin">
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Settings className="h-3 w-3 mr-1" />
                    AI Settings
                  </Button>
                </Link>
              ) : (
                <p className="text-muted-foreground">
                  Ask your admin to connect an OpenAI API key.
                </p>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[200px] w-full min-w-0 overflow-hidden">
      <CardHeader className="border-b shrink-0 py-2 px-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="h-4 w-4" />
          AI Assistant
        </CardTitle>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-2" ref={scrollRef}>
        <div className="space-y-2">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-2">
              <p className="text-xs">{t('sopAssistant.welcome', 'Ask me anything about your documents!')}</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
              )}
              
              <div
                className={`max-w-[85%] rounded-lg p-2 text-xs ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-xs dark:prose-invert max-w-none break-words overflow-hidden text-xs [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                    <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}
                
                {message.citedDocs && message.citedDocs.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-[10px] font-medium mb-1 flex items-center gap-1">
                      <FileText className="h-2 w-2" />
                      {t('sopAssistant.referencedDocs', 'References:')}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {message.citedDocs.map((doc, docIndex) => (
                        <CitationBadge key={docIndex} title={doc.title} fileId={doc.fileId} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <User className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-3 w-3 text-primary" />
              </div>
              <div className="bg-muted rounded-lg p-2">
                <div className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-[10px] text-muted-foreground">{t('sopAssistant.thinking', 'Thinking...')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-2 border-t shrink-0 space-y-2">
        {suggestions.length > 0 && messages.length === 0 && (
          <div className="flex flex-wrap gap-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(s)}
                disabled={loading}
                className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-muted/70 border border-border text-foreground disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('sopAssistant.placeholder', 'Ask a question...')}
            disabled={loading}
            className="flex-1 text-xs h-7"
          />
          <Button onClick={() => handleSend()} disabled={loading || !input.trim()} size="sm" className="h-7 px-2">
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
