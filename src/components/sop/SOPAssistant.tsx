// SOP Assistant - AI chat component that uses org's OpenAI key
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

interface Message {
  role: "user" | "assistant";
  content: string;
  citedDocs?: { title: string; fileId: string; webViewLink: string }[];
}

export function SOPAssistant() {
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

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
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
      console.error("SOP Assistant error:", error);
      
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
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!aiConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            SOP Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>AI Provider Required</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>Connect your AI provider to enable the SOP Assistant.</p>
              {isAdmin ? (
                <Link to="/admin">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Go to AI Settings
                  </Button>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Please ask your administrator to connect an OpenAI API key in the Admin panel.
                </p>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          SOP Assistant
        </CardTitle>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">{t('sopAssistant.welcome', 'Ask me about your SOPs!')}</p>
              <p className="text-sm mt-1">
                {t('sopAssistant.description', "I can answer questions about your organization's documents.")}
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}
                
                {message.citedDocs && message.citedDocs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-medium mb-2 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {t('sopAssistant.referencedDocs', 'Referenced Documents:')}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {message.citedDocs.map((doc, docIndex) => (
                        <a
                          key={docIndex}
                          href={doc.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1"
                        >
                          <Badge variant="secondary" className="text-xs hover:bg-secondary/80">
                            {doc.title}
                            <ExternalLink className="h-2 w-2 ml-1" />
                          </Badge>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">{t('sopAssistant.thinking', 'Thinking...')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('sopAssistant.placeholder', 'Ask about your SOPs...')}
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {t('sopAssistant.poweredBy', "Powered by your organization's AI provider. Answers are based on your documents.")}
        </p>
      </div>
    </Card>
  );
}
