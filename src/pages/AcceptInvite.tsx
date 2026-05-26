import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Paintbrush, AlertCircle, CheckCircle2, Chrome } from "lucide-react";

type InvitationInfo = {
  valid: true;
  email: string;
  full_name: string | null;
  role: string;
  org_name: string;
  org_logo: string | null;
  expires_at: string;
} | {
  valid: false;
  reason: "expired" | "revoked" | "not_found" | "already_accepted";
};

const reasonText: Record<string, string> = {
  expired: "This invitation has expired. Please ask your admin to send a new one.",
  revoked: "This invitation has been revoked. Please contact your admin.",
  not_found: "This invitation link is not valid. Please contact your admin.",
  already_accepted: "This invitation has already been accepted. Please sign in normally.",
};

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [mismatchError, setMismatchError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setInfo({ valid: false, reason: "not_found" });
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("validate-invitation", {
          body: { token },
        });
        if (error) throw error;
        setInfo(data as InvitationInfo);
      } catch (e: any) {
        setInfo({ valid: false, reason: "not_found" });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // If already signed in, try to auto-accept
  useEffect(() => {
    if (user && info && info.valid && !accepting) {
      void acceptNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, info]);

  const acceptNow = async () => {
    if (!token) return;
    setAccepting(true);
    setMismatchError(null);
    try {
      const { data, error } = await supabase.functions.invoke("accept-invitation", {
        body: { token },
      });
      if (error || (data as any)?.error) {
        const payload = (data as any) ?? {};
        if (payload.email_mismatch) {
          await supabase.auth.signOut();
          setMismatchError(
            `This invitation was sent to ${payload.invitation_email}, but you signed in as ${payload.signed_in_email}. Please sign out of Google and try again with the correct account.`,
          );
          return;
        }
        toast({
          variant: "destructive",
          title: "Could not accept invitation",
          description: payload.error || error?.message || "Unknown error",
        });
        return;
      }
      const orgName = info && info.valid ? info.org_name : "your team";
      toast({ title: `Welcome to ${orgName}!`, description: "You're all set." });
      navigate("/");
    } finally {
      setAccepting(false);
    }
  };

  const handleGoogle = async () => {
    if (!token) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/accept-invite?token=${token}` },
    });
    if (error) {
      const friendly = /provider is not enabled|Unsupported provider/i.test(error.message)
        ? "Google sign-in not configured. Contact your admin."
        : error.message;
      toast({ variant: "destructive", title: "Google sign-in failed", description: friendly });
    }
  };

  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info || !info.valid || !token) return;
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Password too short", description: "Use at least 6 characters." });
      return;
    }
    setSubmitting(true);
    try {
      // Try sign in first
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: info.email,
        password,
      });
      if (signInErr) {
        // Fallback: create account
        const { error: signUpErr } = await supabase.auth.signUp({
          email: info.email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/accept-invite?token=${token}`,
            data: { full_name: info.full_name || "" },
          },
        });
        if (signUpErr) {
          toast({ variant: "destructive", title: "Sign-in failed", description: signUpErr.message });
          return;
        }
      }
      // useEffect on `user` will trigger acceptNow
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
              <Paintbrush className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-serif">Team Invitation</CardTitle>
          {info && info.valid && (
            <CardDescription>
              You've been invited to join <strong>{info.org_name}</strong>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {info && !info.valid && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm">{reasonText[info.reason]}</p>
            </div>
          )}

          {info && info.valid && (
            <>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{info.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Role</span><Badge variant="secondary">{info.role}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Expires</span><span>{new Date(info.expires_at).toLocaleDateString()}</span></div>
              </div>

              {accepting && (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Completing your invitation…
                </div>
              )}

              {mismatchError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{mismatchError}</p>
                </div>
              )}

              {!user && !accepting && (
                <>
                  <Button onClick={handleGoogle} variant="outline" className="w-full">
                    <Chrome className="h-4 w-4 mr-2" /> Sign in with Google
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>

                  <form onSubmit={handleEmailPassword} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="invited-email">Email</Label>
                      <Input id="invited-email" type="email" value={info.email} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invited-password">Password</Label>
                      <Input
                        id="invited-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        disabled={submitting}
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">
                        We'll sign you in if you already have an account, or create one if not.
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Continue with Email
                    </Button>
                  </form>
                </>
              )}
            </>
          )}

          <div className="text-center text-xs text-muted-foreground pt-2">
            <Link to="/auth" className="hover:text-primary underline">Back to sign in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
