import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Paintbrush, Loader2, Globe, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
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

const step1Schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  country: z.string().optional(),
});

const step2Schema = z.object({
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Terms of Service" }),
  }),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Privacy Policy" }),
  }),
  disclaimerAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must acknowledge the disclaimer" }),
  }),
});

const countries = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "UK", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "IE", name: "Ireland" },
  { code: "other", name: "Other" },
];

const Auth = () => {
  const { t, i18n } = useTranslation();
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Mode
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Signup Step 1 fields
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  
  // Signup Step 2 fields
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  
  // Signup Step 3 (success)
  const [signupComplete, setSignupComplete] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const validateLoginForm = () => {
    try {
      loginSchema.parse({ email, password });
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

  const validateStep1 = () => {
    try {
      step1Schema.parse({ email, password, companyName, country });
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

  const validateStep2 = () => {
    try {
      step2Schema.parse({ termsAccepted, privacyAccepted, disclaimerAccepted });
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLoginForm()) return;

    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setSignupStep(2);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const { error, data } = await signUp(email, password, companyName, preferredLanguage, country);
      if (error) {
        toast({
          variant: "destructive",
          title: "Sign up failed",
          description: error.message.includes("already registered")
            ? "This email is already registered. Please sign in instead."
            : error.message,
        });
        setSignupStep(1);
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
        setSignupStep(3);
        setSignupComplete(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetSignup = () => {
    setIsLogin(true);
    setSignupStep(1);
    setSignupComplete(false);
    setEmail("");
    setPassword("");
    setCompanyName("");
    setCountry("");
    setTermsAccepted(false);
    setPrivacyAccepted(false);
    setDisclaimerAccepted(false);
    setErrors({});
  };

  const allCheckboxesChecked = termsAccepted && privacyAccepted && disclaimerAccepted;

  // Login Form
  if (isLogin) {
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
            <CardDescription>Sign in to access your training portal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
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
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
            <div className="mt-6 text-center space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setErrors({});
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Don't have an account? Sign up
              </button>
              <div className="mt-2">
                <Link 
                  to="/pricing" 
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  View Pricing →
                </Link>
              </div>
              <div className="text-xs text-muted-foreground space-x-2">
                <Link to="/terms" className="hover:text-primary transition-colors underline">
                  Terms
                </Link>
                <span>·</span>
                <Link to="/privacy" className="hover:text-primary transition-colors underline">
                  Privacy
                </Link>
                <span>·</span>
                <Link to="/compliance-guidance" className="hover:text-primary transition-colors underline">
                  Compliance Guidance
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signup Step 3 - Success
  if (signupStep === 3 && signupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-serif">Account Created!</CardTitle>
            <CardDescription>Your account has been successfully created.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground">
              You can now sign in with your credentials to access the training portal.
            </p>
            <Button onClick={resetSignup} className="w-full">
              Continue to Sign In
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Operational guidance only. Not legal advice.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signup Step 2 - Legal Acknowledgment
  if (signupStep === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                <Paintbrush className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-serif">Before You Continue</CardTitle>
            <CardDescription>
              This app provides operational guidance and tools. It is not a legal compliance system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-3 rounded-lg border border-border bg-muted/30">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    disabled={loading}
                    className="mt-0.5"
                  />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    I agree to the{" "}
                    <Link to="/terms" target="_blank" className="text-primary underline hover:text-primary/80">
                      Terms of Service
                    </Link>
                  </Label>
                </div>
                {errors.termsAccepted && <p className="text-sm text-destructive">{errors.termsAccepted}</p>}

                <div className="flex items-start space-x-3 p-3 rounded-lg border border-border bg-muted/30">
                  <Checkbox
                    id="privacy"
                    checked={privacyAccepted}
                    onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                    disabled={loading}
                    className="mt-0.5"
                  />
                  <Label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
                    I have read and agree to the{" "}
                    <Link to="/privacy" target="_blank" className="text-primary underline hover:text-primary/80">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {errors.privacyAccepted && <p className="text-sm text-destructive">{errors.privacyAccepted}</p>}

                <div className="flex items-start space-x-3 p-3 rounded-lg border border-border bg-muted/30">
                  <Checkbox
                    id="disclaimer"
                    checked={disclaimerAccepted}
                    onCheckedChange={(checked) => setDisclaimerAccepted(checked === true)}
                    disabled={loading}
                    className="mt-0.5"
                  />
                  <Label htmlFor="disclaimer" className="text-sm leading-relaxed cursor-pointer">
                    I acknowledge this app is not a legal compliance app and does not provide legal advice
                  </Label>
                </div>
                {errors.disclaimerAccepted && <p className="text-sm text-destructive">{errors.disclaimerAccepted}</p>}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSignupStep(1)}
                  disabled={loading}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !allCheckboxesChecked}
                  className="flex-1"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signup Step 1 - Account Details
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
              <Paintbrush className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-serif">Create Your Account</CardTitle>
          <CardDescription>Get started with SOPEDU</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleStep1Continue} className="space-y-4">
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
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
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
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Painting Company"
                disabled={loading}
              />
              {errors.companyName && <p className="text-sm text-destructive">{errors.companyName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country / Region (Optional)</Label>
              <Select value={country} onValueChange={setCountry} disabled={loading}>
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
          <div className="mt-6 text-center space-y-2">
            <button
              type="button"
              onClick={resetSignup}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Already have an account? Sign in
            </button>
            <div className="text-xs text-muted-foreground space-x-2">
              <Link to="/terms" className="hover:text-primary transition-colors underline">
                Terms
              </Link>
              <span>·</span>
              <Link to="/privacy" className="hover:text-primary transition-colors underline">
                Privacy
              </Link>
              <span>·</span>
              <Link to="/compliance-guidance" className="hover:text-primary transition-colors underline">
                Compliance Guidance
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
