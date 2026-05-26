import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, Send, RefreshCw, XCircle, Copy } from "lucide-react";

type Invitation = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  inviter_name?: string;
};

const ROLE_OPTIONS = ["admin", "foreman", "painter", "office", "other"];

export function InvitationsManager() {
  const { org } = useOrganization();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("painter");
  const [sending, setSending] = useState(false);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchInvitations = async () => {
    if (!org?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("org_invitations" as any)
        .select("*")
        .eq("org_id", org.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as Invitation[];
      // hydrate inviter name
      const inviterIds = [...new Set(rows.map((r) => r.invited_by))];
      if (inviterIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", inviterIds);
        const map = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name || p.email]));
        rows.forEach((r) => { r.inviter_name = map.get(r.invited_by) as string | undefined; });
      }
      setInvitations(rows);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchInvitations(); }, [org?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: { email: email.trim().toLowerCase(), full_name: fullName.trim() || null, role },
      });
      const payload = (data as any) ?? {};
      if (error || payload.error) {
        toast({
          variant: "destructive",
          title: "Could not send invitation",
          description: payload.error || error?.message || "Unknown error",
        });
        return;
      }
      if (payload.warning && payload.acceptUrl) {
        toast({
          title: "Invitation created (no email)",
          description: payload.warning,
          duration: 15000,
        });
        try { await navigator.clipboard.writeText(payload.acceptUrl); } catch (_e) { /* ignore */ }
      } else {
        toast({
          title: "Invitation sent",
          description: `${email} has 7 days to accept.`,
        });
      }
      setEmail(""); setFullName(""); setRole("painter");
      setOpen(false);
      void fetchInvitations();
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (inv: Invitation) => {
    setActingId(inv.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: { invitation_id: inv.id, email: inv.email, role: inv.role, full_name: inv.full_name },
      });
      const payload = (data as any) ?? {};
      if (error || payload.error) {
        toast({ variant: "destructive", title: "Resend failed", description: payload.error || error?.message });
        return;
      }
      toast({ title: "Invitation resent", description: `${inv.email} — expires in 7 days.` });
      void fetchInvitations();
    } finally {
      setActingId(null);
    }
  };

  const handleRevoke = async (inv: Invitation) => {
    if (!confirm(`Revoke invitation for ${inv.email}?`)) return;
    setActingId(inv.id);
    try {
      const { error } = await supabase
        .from("org_invitations" as any)
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", inv.id);
      if (error) {
        toast({ variant: "destructive", title: "Revoke failed", description: error.message });
        return;
      }
      toast({ title: "Invitation revoked" });
      void fetchInvitations();
    } finally {
      setActingId(null);
    }
  };

  const statusFor = (inv: Invitation): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (inv.accepted_at) return { label: "Accepted", variant: "secondary" };
    if (inv.revoked_at) return { label: "Revoked", variant: "destructive" };
    if (new Date(inv.expires_at).getTime() < Date.now()) return { label: "Expired", variant: "outline" };
    return { label: "Pending", variant: "default" };
  };

  const visible = invitations.filter((i) => !i.accepted_at);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Invite Employees
            </CardTitle>
            <CardDescription>
              Send an invitation email — your employees create their own login (Google or password).
            </CardDescription>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Send className="h-4 w-4 mr-2" /> Invite Employee
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground py-6">No pending invitations.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent by</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((inv) => {
                  const s = statusFor(inv);
                  const disabled = !!inv.accepted_at;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <div className="font-medium">{inv.email}</div>
                        {inv.full_name && <div className="text-xs text-muted-foreground">{inv.full_name}</div>}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{inv.role}</Badge></TableCell>
                      <TableCell className="text-sm">{inv.inviter_name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm" variant="ghost"
                            disabled={disabled || actingId === inv.id}
                            onClick={() => handleResend(inv)}
                          >
                            {actingId === inv.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <><RefreshCw className="h-3 w-3 mr-1" /> Resend</>}
                          </Button>
                          {!inv.revoked_at && (
                            <Button
                              size="sm" variant="ghost"
                              disabled={disabled || actingId === inv.id}
                              onClick={() => handleRevoke(inv)}
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Revoke
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite an Employee</DialogTitle>
            <DialogDescription>
              They'll receive an email with a link to join your organization. Invitations expire after 7 days.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="employee@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-name">Full name (optional)</Label>
              <Input id="inv-name" value={fullName}
                onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="inv-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</> : <><Send className="h-4 w-4 mr-2" />Send Invitation</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
