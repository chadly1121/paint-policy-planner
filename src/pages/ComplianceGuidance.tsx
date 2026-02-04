import { Link } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle, CheckCircle2, BookOpen, Scale, FileText, Users, Award } from "lucide-react";
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
            <p className="text-lg text-muted-foreground">Understanding How SOPed.ai Works</p>
          </div>

          {/* What This Platform Is */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">What SOPed.ai Is</h2>
                  <p className="text-foreground/90 mb-4">
                    SOPed.ai is a training and document management platform that helps organizations:
                  </p>
                  <ul className="space-y-2 text-foreground/90">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Store and organize SOPs, policies, and training materials in Google Drive
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Track employee acknowledgments and quiz completions
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Manage certifications and expiry reminders
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Document incidents and safety data sheets
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Generate AI-powered quizzes to verify employee understanding
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What This Platform Is NOT */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">What SOPed.ai Is NOT</h2>
                  <ul className="space-y-2 text-foreground/90">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      NOT a legal compliance verification system
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      NOT a substitute for legal, HR, or safety professionals
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      NOT a guarantee that your documents meet regulatory requirements
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      NOT responsible for the accuracy of your custom content
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How the System Works */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">How the System Works</h2>
                  <ul className="space-y-3 text-foreground/90">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary min-w-6">1.</span>
                      <span><strong>Google Drive Integration:</strong> Your organization's documents are stored in your own Google Drive. SOPed.ai reads and displays them—we never store document content on our servers.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary min-w-6">2.</span>
                      <span><strong>AI Quiz Generation:</strong> Quizzes are generated based on your document content using AI. These test comprehension of the material you provide.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary min-w-6">3.</span>
                      <span><strong>Acknowledgment Tracking:</strong> When employees acknowledge SOPs, we record timestamps and metadata for audit purposes.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary min-w-6">4.</span>
                      <span><strong>Progress Tracking:</strong> Quiz completions and acknowledgments are tracked to show training progress across your team.</span>
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
                  <p className="text-foreground/90 mb-3">As the organization using SOPed.ai, you are responsible for:</p>
                  <ul className="space-y-2 text-foreground/90">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      Creating accurate, legally compliant SOPs and policies
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      Reviewing AI-generated quiz questions for accuracy
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      Ensuring your training meets your jurisdiction's requirements
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      Maintaining your Google Drive connection and document organization
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      Consulting professionals for legal, safety, and HR requirements
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
                  <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">Data & Privacy</h2>
                  <ul className="space-y-2 text-foreground/90">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>Document content stays in your Google Drive—we access it via secure API tokens</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>We store acknowledgments, quiz results, and progress data for tracking purposes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>Audit logs record actions with timestamps for compliance verification</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>You can revoke Google Drive access at any time from Admin settings</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">Best Practices</h2>
                  <ul className="space-y-3 text-foreground/90">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Review AI-generated quizzes before employees take them</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Keep your SOPs and policies updated as regulations change</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Use acknowledgments for critical policies that require documented sign-off</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>Monitor expiring certifications and set reminder thresholds in Admin settings</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Our Philosophy */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Our Philosophy</h2>
              <p className="text-foreground/90 mb-4">SOPed.ai provides:</p>
              <ul className="space-y-3 text-foreground/90">
                <li className="flex items-start gap-3">
                  <span className="font-semibold text-primary">→</span>
                  <span><strong>Structure</strong> — Organized document management and training workflows</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-semibold text-primary">→</span>
                  <span><strong>Accountability</strong> — Tracked acknowledgments and quiz completions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-semibold text-primary">→</span>
                  <span><strong>Visibility</strong> — Progress tracking and expiry reminders</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-semibold text-primary">→</span>
                  <span><strong>Your Content</strong> — Documents stay in your Google Drive under your control</span>
                </li>
              </ul>
              <div className="mt-6 pt-6 border-t border-primary/20">
                <p className="text-center text-foreground font-medium">
                  We provide the tools. You provide the content.<br />
                  <span className="text-muted-foreground">Compliance is your responsibility.</span>
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
