// Admin view: scans every doc's content for ROP-XXX-### references and lists ones that don't resolve.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { DOC_REF_REGEX, useDocRegistry } from "@/hooks/useDocRegistry";

const SOURCE_TABLES = [
  { table: "company_policies" as const, label: "Policies" },
  { table: "company_sops" as const, label: "SOPs" },
  { table: "company_forms" as const, label: "Forms" },
  { table: "company_safety" as const, label: "Safety" },
  { table: "company_training" as const, label: "Training" },
  { table: "company_disciplinary" as const, label: "Disciplinary" },
];

interface BrokenRefSource {
  table: string;
  title: string;
  sentence: string;
}

interface BrokenRef {
  ref: string;
  sources: BrokenRefSource[];
}

// Pull the sentence (or short window) around the match so admins can see context.
function sentenceAround(text: string, index: number, length: number): string {
  const start = Math.max(0, text.lastIndexOf(".", index - 1) + 1);
  let end = text.indexOf(".", index + length);
  if (end === -1) end = Math.min(text.length, index + length + 120);
  return text.slice(start, end + 1).replace(/\s+/g, " ").trim().slice(0, 240);
}

// Merge body content + parsed_sections.policy_statement + procedure_steps into one
// scannable string per row so a ref anywhere in the structured doc is caught.
function collectScannable(row: {
  content: string | null;
  parsed_sections: Record<string, unknown> | null;
}): string {
  const parts: string[] = [];
  if (row.content) parts.push(row.content);
  const ps = row.parsed_sections as any;
  if (ps && typeof ps === "object") {
    if (typeof ps.policy_statement === "string") parts.push(ps.policy_statement);
    if (Array.isArray(ps.procedure_steps)) {
      parts.push(ps.procedure_steps.filter((s: unknown) => typeof s === "string").join(". "));
    }
    if (Array.isArray(ps.non_negotiables)) {
      parts.push(ps.non_negotiables.filter((s: unknown) => typeof s === "string").join(". "));
    }
  }
  return parts.join("\n\n");
}

export function BrokenReferencesCard() {
  const { data: registry, isLoading: registryLoading } = useDocRegistry();

  const { data, isLoading } = useQuery({
    queryKey: ["broken-references", registry?.size ?? 0],
    enabled: !!registry,
    queryFn: async (): Promise<BrokenRef[]> => {
      const broken = new Map<string, BrokenRef>();

      await Promise.all(
        SOURCE_TABLES.map(async ({ table, label }) => {
          const { data: rows } = await supabase
            .from(table)
            .select("title, content, parsed_sections");
          if (!rows) return;
          for (const row of rows as Array<{ title: string; content: string | null; parsed_sections: Record<string, unknown> | null }>) {
            const scannable = collectScannable(row);
            if (!scannable) continue;
            const regex = new RegExp(DOC_REF_REGEX.source, "g");
            let m: RegExpExecArray | null;
            while ((m = regex.exec(scannable)) !== null) {
              const key = m[0].toUpperCase();
              if (registry!.has(key)) continue;
              const sentence = sentenceAround(scannable, m.index, m[0].length);
              const existing = broken.get(key) ?? { ref: key, sources: [] };
              if (!existing.sources.some((s) => s.table === label && s.title === row.title && s.sentence === sentence)) {
                existing.sources.push({ table: label, title: row.title, sentence });
              }
              broken.set(key, existing);
            }
          }
        })
      );

      return Array.from(broken.values()).sort((a, b) => a.ref.localeCompare(b.ref));
    },
  });

  const loading = registryLoading || isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Broken Document References
        </CardTitle>
        <CardDescription>
          Document IDs referenced inside other documents but missing from your library. Create them or correct the typo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Scanning documents…
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            No broken references found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Missing Reference</TableHead>
                <TableHead>Referenced From</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.ref}>
                  <TableCell>
                    <Badge variant="destructive" className="font-mono">{row.ref}</Badge>
                  </TableCell>
                  <TableCell>
                    <ul className="space-y-1 text-sm">
                      {row.sources.map((s, i) => (
                        <li key={i} className="text-muted-foreground">
                          <span className="text-foreground">{s.title}</span>{" "}
                          <span className="text-xs">({s.table})</span>
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
