import { Link } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle, CheckCircle2, BookOpen, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ComplianceGuidance = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/auth">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        <div className="space-y-8">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Compliance Guidance</h1>
            <p className="text-lg text-muted-foreground">How to Use This App Responsibly</p>
          </div>

          {/* What This App Is */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">What This App Is</h2>
                  <p className="text-foreground/90">
                    This app is an operational system designed to help painting and contracting businesses 
                    run cleaner, safer, more organized jobs using standardized procedures, checklists, and workflows.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What This App Is NOT */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">What This App Is NOT</h2>
                  <ul className="space-y-2 text-foreground/90">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      This is not a legal compliance app
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      This is not legal, employment, or safety advice
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      This app does not guarantee compliance with any law
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Why We Built It This Way */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">Why We Built It This Way</h2>
                  <p className="text-foreground/90 mb-4">
                    Laws vary by country, province, state, and even city—and they change constantly. 
                    No single app can accurately guarantee compliance everywhere.
                  </p>
                  <p className="text-foreground/90 mb-2">Instead, this app focuses on:</p>
                  <ul className="space-y-2 text-foreground/90">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Industry best practices
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Professional standards
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Clear operational discipline
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Documentation and accountability
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Responsibility */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Scale className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">Your Responsibility</h2>
                  <p className="text-foreground/90 mb-2">You are responsible for:</p>
                  <ul className="space-y-2 text-foreground/90">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      Understanding which laws apply to your business
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      Adjusting policies to your jurisdiction
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      Consulting professionals when required
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How to Use This App Safely */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">How to Use This App Safely</h2>
              <ul className="space-y-3 text-foreground/90">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Use SOPs as a starting point, not a legal conclusion</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Modify language as needed for your region</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Review policies with legal or safety professionals if required</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Our Philosophy */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Our Philosophy</h2>
              <p className="text-foreground/90 mb-4">We believe:</p>
              <ul className="space-y-3 text-foreground/90">
                <li className="flex items-start gap-3">
                  <span className="font-semibold text-primary">→</span>
                  <span>Strong operations reduce risk</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-semibold text-primary">→</span>
                  <span>Clear rules prevent problems</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-semibold text-primary">→</span>
                  <span>Accountability beats chaos</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-semibold text-primary">→</span>
                  <span>Professionalism protects businesses</span>
                </li>
              </ul>
              <div className="mt-6 pt-6 border-t border-primary/20">
                <p className="text-center text-foreground font-medium">
                  This app gives you structure.<br />
                  <span className="text-muted-foreground">You decide how to apply it legally.</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer links */}
          <div className="text-center text-sm text-muted-foreground space-x-4 pt-4">
            <Link to="/terms" className="hover:text-primary transition-colors underline">
              Terms of Service
            </Link>
            <span>·</span>
            <Link to="/privacy" className="hover:text-primary transition-colors underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceGuidance;
