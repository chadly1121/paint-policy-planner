import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Shield, BookOpen, Clock, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";

const ONBOARDING_DISCLAIMER_VERSION = "onboarding-v1";
const MIN_PER_SECTION = 5;

interface AssignedSection {
  sop_id: string;
  title: string;
}

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
}

export const OnboardingWizard = ({ open, onComplete }: OnboardingWizardProps) => {
  const { user } = useAuth();
  const { org } = useOrg();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<AssignedSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);

  useEffect(() => {
    if (!open || step !== 3 || !user?.id) return;
    const load = async () => {
      setLoadingSections(true);
      try {
        const { data, error } = await supabase.rpc("get_user_assigned_sops", {
          _user_id: user.id,
        });
        if (error) throw error;
        setSections((data || []).map((s: { sop_id: string; title: string }) => ({
          sop_id: s.sop_id,
          title: s.title,
        })));
      } catch (e) {
        console.error("Failed to load assigned sections", e);
      } finally {
        setLoadingSections(false);
      }
    };
    load();
  }, [open, step, user?.id]);

  const handleAcceptDisclaimer = async () => {
    if (!agreed || !user?.id) return;
    setSaving(true);
    try {
      // Skip if a row already exists for this version
      const { data: existing } = await supabase
        .from("disclaimer_acceptances")
        .select("id")
        .eq("user_id", user.id)
        .eq("disclaimer_version", ONBOARDING_DISCLAIMER_VERSION)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from("disclaimer_acceptances").insert({
          user_id: user.id,
          disclaimer_version: ONBOARDING_DISCLAIMER_VERSION,
          user_agent: navigator.userAgent,
        });
        if (error) throw error;
      }
      setStep(3);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Could not record acceptance",
        description: "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStart = () => {
    onComplete();
    navigate("/sops");
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-muted-foreground">
            Getting started — step {step} of 3
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-2">
            <div className="flex flex-col items-center text-center gap-4">
              {org?.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={`${org.name} logo`}
                  className="h-20 w-20 rounded-lg object-contain border bg-background p-2"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-10 w-10 text-primary" />
                </div>
              )}
              <div>
                <h2 className="font-serif text-2xl font-bold">Welcome to {org?.name ?? "your team"}</h2>
                {org?.tagline && (
                  <p className="mt-1 text-sm text-muted-foreground italic">{org.tagline}</p>
                )}
              </div>
              <p className="text-foreground/90 leading-relaxed max-w-prose">
                {org?.onboarding_welcome_message ||
                  "We're glad to have you on board. The next few steps will walk you through your required reading. Take your time — when you're done, you'll be set up for your first day."}
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Before we begin</h2>
            </div>
            <Alert>
              <AlertDescription className="text-sm leading-relaxed">
                The materials in this employee handbook are operational guidance from your employer.
                They are not legal advice and don't replace conversations with your supervisor.
                By continuing, you acknowledge that you have read this notice and agree to review
                your assigned documents and complete any required acknowledgments.
              </AlertDescription>
            </Alert>
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                id="onboarding-agree"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
              />
              <Label htmlFor="onboarding-agree" className="text-sm font-normal leading-relaxed cursor-pointer">
                I understand and agree to proceed.
              </Label>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleAcceptDisclaimer} disabled={!agreed || saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : "Accept & continue"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">
                Here {sections.length === 1 ? "is" : "are"} your {sections.length} required section
                {sections.length === 1 ? "" : "s"}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Estimated total time: ~{Math.max(sections.length, 1) * MIN_PER_SECTION} min
            </p>

            {loadingSections ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sections.length === 0 ? (
              <Alert>
                <AlertDescription>
                  You don't have any sections assigned yet. You can explore the handbook on your own —
                  your admin will assign you required reading shortly.
                </AlertDescription>
              </Alert>
            ) : (
              <ul className="divide-y rounded-md border max-h-72 overflow-auto">
                {sections.map((s) => (
                  <li key={s.sop_id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{s.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">~{MIN_PER_SECTION} min</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleStart}>
                Start reading <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;
