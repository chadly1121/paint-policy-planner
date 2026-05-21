// Renders a doc's outgoing relationships, grouped by type, with linked + tooltipped refs.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, Loader2 } from "lucide-react";
import { DocReferenceText } from "@/components/docref/DocReferenceText";
import { useDocumentRelationships, type DocRelationshipType } from "@/hooks/useDocumentRelationships";

const TYPE_LABEL: Record<DocRelationshipType, string> = {
  related: "Related",
  suggested_next: "Suggested Next",
  depends_on: "Depends On",
  replaces: "Replaces",
};

const TYPE_ORDER: DocRelationshipType[] = ["depends_on", "related", "suggested_next", "replaces"];

interface Props {
  fromDocIdExternal: string | null;
}

export function RelatedDocumentsPanel({ fromDocIdExternal }: Props) {
  const { data, isLoading } = useDocumentRelationships(fromDocIdExternal);

  if (!fromDocIdExternal) return null;
  if (isLoading) {
    return (
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading related documents…
      </div>
    );
  }
  if (!data || data.length === 0) return null;

  const grouped = TYPE_ORDER
    .map((t) => ({ type: t, items: data.filter((r) => r.relationship_type === t) }))
    .filter((g) => g.items.length > 0);

  return (
    <Card className="mt-4 border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-primary">
          <Link2 className="h-4 w-4" /> Related Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {grouped.map((g) => (
          <div key={g.type}>
            <Badge variant="outline" className="mb-2 text-xs">{TYPE_LABEL[g.type]}</Badge>
            <ul className="space-y-1">
              {g.items.map((r) => (
                <li key={r.id} className="text-sm text-muted-foreground flex flex-wrap items-baseline gap-2">
                  <DocReferenceText text={r.to_doc_id_external} />
                  {r.notes && <span className="text-xs">— {r.notes}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
