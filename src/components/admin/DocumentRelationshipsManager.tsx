// Admin UI: view/add/remove document relationships without editing doc body text.
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useDocRegistry } from "@/hooks/useDocRegistry";
import {
  useAllOrgRelationships,
  useDeleteRelationship,
  useUpsertRelationship,
  type DocRelationshipType,
} from "@/hooks/useDocumentRelationships";

const REF_RX = /^ROP-(POL|SOP|FRM|SAF|TRN|DSC)-\d{3}$/;

const TYPES: { value: DocRelationshipType; label: string }[] = [
  { value: "related", label: "Related" },
  { value: "suggested_next", label: "Suggested Next" },
  { value: "depends_on", label: "Depends On" },
  { value: "replaces", label: "Replaces" },
];

export function DocumentRelationshipsManager() {
  const { toast } = useToast();
  const { org } = useOrganization();
  const { data: registry } = useDocRegistry();
  const { data: rels, isLoading } = useAllOrgRelationships();
  const upsert = useUpsertRelationship();
  const del = useDeleteRelationship();

  const [filterDoc, setFilterDoc] = useState<string>("__all__");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState<DocRelationshipType>("related");
  const [notes, setNotes] = useState("");

  const docOptions = useMemo(() => {
    if (!registry) return [];
    return Array.from(registry.values()).sort((a, b) =>
      a.doc_id_external.localeCompare(b.doc_id_external)
    );
  }, [registry]);

  const filtered = useMemo(() => {
    if (!rels) return [];
    if (filterDoc === "__all__") return rels;
    return rels.filter(
      (r) => r.from_doc_id_external === filterDoc || r.to_doc_id_external === filterDoc
    );
  }, [rels, filterDoc]);

  const titleOf = (key: string) => registry?.get(key)?.title ?? null;

  const handleAdd = async () => {
    const f = from.trim().toUpperCase();
    const t = to.trim().toUpperCase();
    if (!REF_RX.test(f) || !REF_RX.test(t)) {
      toast({
        variant: "destructive",
        title: "Invalid reference",
        description: "Use the format ROP-POL-001 (POL, SOP, FRM, SAF, TRN, or DSC).",
      });
      return;
    }
    if (f === t) {
      toast({ variant: "destructive", title: "A document can't reference itself." });
      return;
    }
    if (!org?.id) return;
    try {
      await upsert.mutateAsync({
        org_id: org.id,
        from_doc_id_external: f,
        to_doc_id_external: t,
        relationship_type: type,
        notes: notes.trim() || null,
      });
      toast({ title: "Relationship saved" });
      setTo("");
      setNotes("");
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not save",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast({ title: "Relationship removed" });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not delete",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" /> Document Relationships
        </CardTitle>
        <CardDescription>
          Link documents to each other without editing their body text. Auto-detected entries are marked with an "auto" badge.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add form */}
        <div className="rounded-md border p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">From</label>
              <Input
                placeholder="ROP-POL-001"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">To</label>
              <Input
                placeholder="ROP-SOP-014"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Type</label>
              <Select value={type} onValueChange={(v) => setType(v as DocRelationshipType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:row-span-2 sm:col-span-1">
              <label className="text-xs font-medium">Notes (optional)</label>
              <Textarea
                placeholder="e.g. See for escalation steps"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[40px]"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAdd} disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add relationship
            </Button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Filter:</label>
          <Select value={filterDoc} onValueChange={setFilterDoc}>
            <SelectTrigger className="max-w-xs"><SelectValue placeholder="All documents" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All documents</SelectItem>
              {docOptions.map((d) => (
                <SelectItem key={d.doc_id_external} value={d.doc_id_external}>
                  <span className="font-mono mr-2">{d.doc_id_external}</span>{d.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">No relationships yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const fromTitle = titleOf(r.from_doc_id_external);
                const toTitle = titleOf(r.to_doc_id_external);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-mono text-xs">{r.from_doc_id_external}</div>
                      {fromTitle && <div className="text-xs text-muted-foreground">{fromTitle}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TYPES.find((t) => t.value === r.relationship_type)?.label ?? r.relationship_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">{r.to_doc_id_external}</div>
                      {toTitle ? (
                        <div className="text-xs text-muted-foreground">{toTitle}</div>
                      ) : (
                        <div className="text-xs text-amber-600">not in library</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px]">
                      {r.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.source === "auto" ? "secondary" : "outline"} className="text-xs">
                        {r.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(r.id)}
                        disabled={del.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
