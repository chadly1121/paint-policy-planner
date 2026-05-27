import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type RoleKey = "painter" | "foreman" | "office" | "other" | "admin";
const ROLE_OPTIONS: RoleKey[] = ["painter", "foreman", "office", "other"];

interface Requirement {
  id: string;
  org_id: string;
  cert_type: string;
  cert_display_name: string;
  description: string | null;
  required_for_roles: string[];
  regulatory_reference: string | null;
  renewal_interval_months: number | null;
  notice_period_days: number;
  is_active: boolean;
}

interface ComplianceRow {
  cert_type: string;
  cert_display_name: string;
  description: string | null;
  regulatory_reference: string | null;
  status: "missing" | "expired" | "expiring_soon" | "valid" | "no_expiry";
  latest_cert_id: string | null;
  expiry_date: string | null;
  days_until_expiry: number | null;
  renewal_interval_months: number | null;
  notice_period_days: number;
}

interface Employee {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  is_hsr: boolean;
  is_safety_supervisor: boolean;
}

function statusTone(status: ComplianceRow["status"]) {
  switch (status) {
    case "missing":
    case "expired":
      return "destructive" as const;
    case "expiring_soon":
      return "secondary" as const;
    case "valid":
      return "default" as const;
    default:
      return "outline" as const;
  }
}

function statusLabel(row: ComplianceRow) {
  switch (row.status) {
    case "missing":
      return "Missing";
    case "expired":
      return `Expired ${Math.abs(row.days_until_expiry ?? 0)}d ago`;
    case "expiring_soon":
      return `Expires in ${row.days_until_expiry}d`;
    case "valid":
      return "Valid";
    case "no_expiry":
      return "On file";
  }
}

function rollUp(rows: ComplianceRow[]): "green" | "amber" | "red" | "empty" {
  if (rows.length === 0) return "empty";
  if (rows.some((r) => r.status === "missing" || r.status === "expired")) return "red";
  if (rows.some((r) => r.status === "expiring_soon")) return "amber";
  return "green";
}

const ROLLUP_DOT: Record<"green" | "amber" | "red" | "empty", string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-destructive",
  empty: "bg-muted-foreground",
};

const ROLLUP_LABEL: Record<"green" | "amber" | "red" | "empty", string> = {
  green: "Compliant",
  amber: "Expiring soon",
  red: "Non-compliant",
  empty: "No requirements",
};

// ────────────────────────────────────────────────────────────────────────────
// Requirements manager
// ────────────────────────────────────────────────────────────────────────────

function RequirementsManager() {
  const { org } = useOrg();
  const { toast } = useToast();
  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Requirement | null>(null);

  const fetchRequirements = useCallback(async () => {
    if (!org?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("org_cert_requirements")
      .select("*")
      .eq("org_id", org.id)
      .order("cert_display_name");
    if (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Failed to load requirements", description: error.message });
    } else {
      setReqs(data || []);
    }
    setLoading(false);
  }, [org?.id, toast]);

  useEffect(() => {
    void fetchRequirements();
  }, [fetchRequirements]);

  const handleToggleActive = async (req: Requirement) => {
    const { error } = await (supabase as any)
      .from("org_cert_requirements")
      .update({ is_active: !req.is_active })
      .eq("id", req.id);
    if (error) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } else {
      void fetchRequirements();
    }
  };

  const handleDelete = async (req: Requirement) => {
    // Check usage first
    const { count } = await (supabase as any)
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .eq("cert_type", req.cert_type);
    if ((count ?? 0) > 0) {
      toast({
        title: "Cannot delete — in use",
        description: `${count} certificate(s) use this type. Deactivate instead so historical records stay intact.`,
      });
      return;
    }
    if (!confirm(`Delete requirement "${req.cert_display_name}"?`)) return;
    const { error } = await (supabase as any).from("org_cert_requirements").delete().eq("id", req.id);
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    } else {
      void fetchRequirements();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cert Requirements</CardTitle>
            <CardDescription>
              Define which certifications each role must hold. Defaults seeded with Ontario MOL / WSIB requirements.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Requirement
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : reqs.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">No requirements yet.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cert</TableHead>
                  <TableHead>Required For</TableHead>
                  <TableHead>Renewal</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reqs.map((r) => (
                  <TableRow key={r.id} className={r.is_active ? "" : "opacity-60"}>
                    <TableCell>
                      <p className="font-medium">{r.cert_display_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{r.cert_type}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.required_for_roles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.renewal_interval_months
                        ? `Every ${r.renewal_interval_months} mo`
                        : "One-time"}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        Notice: {r.notice_period_days}d
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                      {r.regulatory_reference || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={r.is_active}
                        onCheckedChange={() => handleToggleActive(r)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(r);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(r)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <RequirementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        requirement={editing}
        orgId={org?.id || ""}
        onSaved={() => {
          setDialogOpen(false);
          void fetchRequirements();
        }}
      />
    </Card>
  );
}

function RequirementDialog({
  open,
  onOpenChange,
  requirement,
  orgId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requirement: Requirement | null;
  orgId: string;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [certType, setCertType] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [reference, setReference] = useState("");
  const [renewalMonths, setRenewalMonths] = useState<string>("");
  const [noticeDays, setNoticeDays] = useState("60");

  useEffect(() => {
    if (requirement) {
      setCertType(requirement.cert_type);
      setDisplayName(requirement.cert_display_name);
      setDescription(requirement.description || "");
      setRoles(requirement.required_for_roles);
      setReference(requirement.regulatory_reference || "");
      setRenewalMonths(requirement.renewal_interval_months?.toString() || "");
      setNoticeDays(requirement.notice_period_days.toString());
    } else {
      setCertType("");
      setDisplayName("");
      setDescription("");
      setRoles([]);
      setReference("");
      setRenewalMonths("");
      setNoticeDays("60");
    }
  }, [requirement, open]);

  const toggleRole = (r: string) => {
    setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  };

  const handleSave = async () => {
    if (!certType.trim() || !displayName.trim() || roles.length === 0) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Cert type, display name, and at least one role are required.",
      });
      return;
    }
    setSaving(true);
    const payload = {
      org_id: orgId,
      cert_type: certType.trim().toLowerCase().replace(/\s+/g, "_"),
      cert_display_name: displayName.trim(),
      description: description.trim() || null,
      required_for_roles: roles,
      regulatory_reference: reference.trim() || null,
      renewal_interval_months: renewalMonths ? parseInt(renewalMonths, 10) : null,
      notice_period_days: parseInt(noticeDays, 10) || 60,
    };
    const { error } = requirement
      ? await (supabase as any)
          .from("org_cert_requirements")
          .update(payload)
          .eq("id", requirement.id)
      : await (supabase as any).from("org_cert_requirements").insert(payload);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
    } else {
      toast({ title: requirement ? "Requirement updated" : "Requirement added" });
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{requirement ? "Edit Requirement" : "Add Requirement"}</DialogTitle>
          <DialogDescription>
            Certifications get enforced for the roles you select. Notice period drives when "expiring soon" warnings start.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cert Type (key)</Label>
              <Input
                value={certType}
                onChange={(e) => setCertType(e.target.value)}
                placeholder="e.g. working_at_heights"
                disabled={!!requirement}
              />
            </div>
            <div>
              <Label>Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Working at Heights"
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label>Required for roles</Label>
            <div className="flex flex-wrap gap-3 mt-1">
              {ROLE_OPTIONS.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={roles.includes(r)} onCheckedChange={() => toggleRole(r)} />
                  {r}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Regulatory Reference</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. O. Reg. 297/13"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Renewal Interval (months)</Label>
              <Input
                type="number"
                value={renewalMonths}
                onChange={(e) => setRenewalMonths(e.target.value)}
                placeholder="36 (blank = one-time)"
              />
            </div>
            <div>
              <Label>Notice Period (days)</Label>
              <Input
                type="number"
                value={noticeDays}
                onChange={(e) => setNoticeDays(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Workforce overview
// ────────────────────────────────────────────────────────────────────────────

function WorkforceOverview() {
  const { org } = useOrg();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [complianceMap, setComplianceMap] = useState<Record<string, ComplianceRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "non_compliant" | "expiring">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!org?.id) return;
    setLoading(true);

    const { data: orgUsers } = await supabase
      .from("org_users")
      .select("user_id, role, is_active, is_hsr, is_safety_supervisor")
      .eq("org_id", org.id)
      .eq("is_active", true);

    if (!orgUsers || orgUsers.length === 0) {
      setEmployees([]);
      setComplianceMap({});
      setLoading(false);
      return;
    }

    const userIds = orgUsers.map((u) => u.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
    const emps: Employee[] = orgUsers.map((u: any) => {
      const p = profileMap.get(u.user_id);
      return {
        user_id: u.user_id,
        full_name: p?.full_name || "—",
        email: p?.email || "",
        role: u.role,
        is_hsr: u.is_hsr,
        is_safety_supervisor: u.is_safety_supervisor,
      };
    });
    setEmployees(emps);

    // Fetch compliance for each user in parallel
    const results = await Promise.all(
      emps.map((e) =>
        (supabase as any)
          .rpc("get_user_cert_compliance", { _user_id: e.user_id, _org_id: org.id })
          .then((r: any) => ({ uid: e.user_id, rows: (r.data as ComplianceRow[]) || [] })),
      ),
    );
    const map: Record<string, ComplianceRow[]> = {};
    results.forEach((r) => {
      map[r.uid] = r.rows;
    });
    setComplianceMap(map);
    setLoading(false);
  }, [org?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = [...employees].sort((a, b) => {
    const order = { red: 0, amber: 1, green: 2, empty: 3 } as const;
    return (
      order[rollUp(complianceMap[a.user_id] || [])] -
      order[rollUp(complianceMap[b.user_id] || [])]
    );
  });

  const filtered = sorted.filter((e) => {
    const tone = rollUp(complianceMap[e.user_id] || []);
    if (filter === "non_compliant") return tone === "red";
    if (filter === "expiring") {
      const rows = complianceMap[e.user_id] || [];
      return rows.some(
        (r) =>
          r.status === "expiring_soon" &&
          r.days_until_expiry !== null &&
          r.days_until_expiry <= 90,
      );
    }
    return true;
  });

  const toggle = (id: string) => {
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Workforce Compliance</CardTitle>
            <CardDescription>
              Per-employee status against active cert requirements for their role.
            </CardDescription>
          </div>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              <SelectItem value="non_compliant">Non-compliant only</SelectItem>
              <SelectItem value="expiring">Expiring within 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">No employees match.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => {
                  const rows = complianceMap[e.user_id] || [];
                  const tone = rollUp(rows);
                  const issues = rows.filter(
                    (r) => r.status === "missing" || r.status === "expired",
                  ).length;
                  const isOpen = expanded.has(e.user_id);
                  return (
                    <>
                      <TableRow key={e.user_id} className="cursor-pointer" onClick={() => toggle(e.user_id)}>
                        <TableCell>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium flex items-center gap-1.5">
                            {e.full_name}
                            {e.is_hsr && (
                              <Badge variant="outline" className="text-xs bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30">
                                HSR
                              </Badge>
                            )}
                            {e.is_safety_supervisor && (
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-label="Safety Supervisor" />
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{e.email}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{e.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${ROLLUP_DOT[tone]}`} />
                            <span className="text-sm">{ROLLUP_LABEL[tone]}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {issues > 0 ? (
                            <Badge variant="destructive">{issues}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow key={`${e.user_id}-details`}>
                          <TableCell colSpan={5} className="bg-muted/30">
                            {rows.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">
                                No certifications required for the {e.role} role.
                              </p>
                            ) : (
                              <ul className="space-y-2 py-1">
                                {rows.map((r) => (
                                  <li key={r.cert_type} className="flex items-start justify-between gap-3 text-sm">
                                    <div className="min-w-0">
                                      <p className="font-medium">{r.cert_display_name}</p>
                                      {r.regulatory_reference && (
                                        <p className="text-xs text-muted-foreground">
                                          {r.regulatory_reference}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant={statusTone(r.status)} className="shrink-0">
                                      {statusLabel(r)}
                                    </Badge>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export default function ComplianceTab() {
  return (
    <div className="space-y-6">
      <RequirementsManager />
      <WorkforceOverview />
    </div>
  );
}
