import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Paintbrush, Loader2, Globe } from "lucide-react";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { languages } from "@/components/LanguageSelector";
import { supabase } from "@/integrations/supabase/client";

const DISCLAIMER_VERSION = "v1.0";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  preferredLanguage: z.string().min(1, "Please select a language"),
  disclaimerAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the disclaimer to create an account" }),
  }),
});

const Auth = () => {
  const { t, i18n } = useTranslation();
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const validateForm = () => {
    try {
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        signupSchema.parse({ email, password, fullName, preferredLanguage, disclaimerAccepted });
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Sign in failed",
            description: error.message === "Invalid login credentials" 
              ? "Invalid email or password. Please try again."
              : error.message,
          });
        }
      } else {
        const { error, data } = await signUp(email, password, fullName, preferredLanguage);
        if (error) {
          toast({
            variant: "destructive",
            title: "Sign up failed",
            description: error.message.includes("already registered")
              ? "This email is already registered. Please sign in instead."
              : error.message,
          });
        } else {
          // Store disclaimer acceptance after successful signup
          if (data?.user) {
            try {
              await supabase.from("disclaimer_acceptances").insert({
                user_id: data.user.id,
                disclaimer_version: DISCLAIMER_VERSION,
                user_agent: navigator.userAgent,
              });
            } catch (disclaimerError) {
              console.error("Failed to record disclaimer acceptance:", disclaimerError);
            }
          }
          
          // Set language immediately after signup
          i18n.changeLanguage(preferredLanguage);
          toast({
            title: "Account created!",
            description: "You can now sign in with your credentials.",
          });
          setIsLogin(true);
          setDisclaimerAccepted(false);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
              <Paintbrush className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-serif">{t("common.companyName")}</CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to access your employee manual" : "Create your account to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Smith"
                    disabled={loading}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredLanguage" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Preferred Language
                  </Label>
                  <Select
                    value={preferredLanguage}
                    onValueChange={setPreferredLanguage}
                    disabled={loading}
                  >
                    <SelectTrigger id="preferredLanguage">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <span className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.preferredLanguage && (
                    <p className="text-sm text-destructive">{errors.preferredLanguage}</p>
                  )}
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={loading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>
            
            {!isLogin && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">Legal Disclaimer & Acknowledgment</p>
                  <p className="text-xs leading-relaxed">
                    <strong>Important Notice – Not Legal Advice:</strong> This application provides operational tools, templates, checklists, and general best-practice guidance for painting and contracting businesses.
                  </p>
                  <p className="text-xs leading-relaxed">
                    This application <strong>does not</strong> provide legal advice, does not guarantee compliance with federal, provincial, state, or local laws, and is not a substitute for professional legal, employment, safety, or regulatory advice.
                  </p>
                  <p className="text-xs leading-relaxed">
                    Laws and regulations vary by jurisdiction and change over time. Users are solely responsible for understanding and complying with all applicable laws, regulations, and industry requirements in their location.
                  </p>
                  <p className="text-xs leading-relaxed font-medium">
                    By using this application, you acknowledge that:
                  </p>
                  <ul className="text-xs list-disc list-inside space-y-1 ml-2">
                    <li>You are responsible for determining legal compliance in your jurisdiction</li>
                    <li>You will consult qualified professionals (e.g., legal counsel, HR, safety advisors) as needed</li>
                    <li>The creators of this application are not liable for compliance decisions made using this software</li>
                  </ul>
                </div>
                
                <div className="flex items-start space-x-3 pt-2 border-t border-border">
                  <Checkbox
                    id="disclaimer"
                    checked={disclaimerAccepted}
                    onCheckedChange={(checked) => setDisclaimerAccepted(checked === true)}
                    disabled={loading}
                    className="mt-0.5"
                  />
                  <Label 
                    htmlFor="disclaimer" 
                    className="text-xs leading-relaxed cursor-pointer font-medium"
                  >
                    I acknowledge and agree that this application is not a legal compliance app, does not provide legal advice, and that I am solely responsible for ensuring compliance with all applicable laws and regulations in my jurisdiction.
                  </Label>
                </div>
                {errors.disclaimerAccepted && (
                  <p className="text-sm text-destructive">{errors.disclaimerAccepted}</p>
                )}
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading || (!isLogin && !disclaimerAccepted)}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
