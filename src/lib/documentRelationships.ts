// Utilities for working with document relationships extracted from doc body text.
import { DOC_REF_REGEX } from "@/hooks/useDocRegistry";

// Section headings that mean "this is a list of related docs, not policy content"
// — must be stripped from rendered body and quiz/AI inputs.
const RELATIONSHIP_HEADINGS: { pattern: RegExp; type: "related" | "suggested_next" | "depends_on" | "replaces" }[] = [
  { pattern: /^related\s+(procedures?|documents?)(\s+and\s+documents?)?$/i, type: "related" },
  { pattern: /^suggested\s+next\s+documents?$/i, type: "suggested_next" },
  { pattern: /^see\s+also$/i, type: "related" },
  { pattern: /^depends\s+on$/i, type: "depends_on" },
  { pattern: /^replaces?$/i, type: "replaces" },
];

export type ExtractedRelationship = {
  to_doc_id_external: string;
  relationship_type: "related" | "suggested_next" | "depends_on" | "replaces";
  notes: string | null;
};

/**
 * Walks markdown line-by-line and returns:
 *   - bodyLines: with all "Related Procedures"/"Suggested next documents"/etc. sections removed
 *   - relationships: extracted ROP-XXX-### references grouped by relationship type
 */
export function extractRelationships(content: string): {
  bodyLines: string[];
  relationships: ExtractedRelationship[];
} {
  const lines = content.split(/\r?\n/);
  const body: string[] = [];
  const rels: ExtractedRelationship[] = [];
  const seen = new Set<string>();

  let skipping: ExtractedRelationship["relationship_type"] | null = null;

  for (const line of lines) {
    const heading = line.match(/^\s*#{1,3}\s+(.+?)\s*$/);
    if (heading) {
      const text = heading[1].replace(/[:*_]/g, "").trim();
      const match = RELATIONSHIP_HEADINGS.find((h) => h.pattern.test(text));
      if (match) {
        skipping = match.type;
        continue; // drop the heading line too
      }
      // Any other heading ends the skip
      skipping = null;
      body.push(line);
      continue;
    }

    if (skipping) {
      // Inside a relationship section — extract refs, do not emit to body
      const refs = line.match(new RegExp(DOC_REF_REGEX.source, "g")) || [];
      for (const ref of refs) {
        const key = ref.toUpperCase();
        const dedupeKey = `${skipping}::${key}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        // capture the line as notes (minus bullets) if there's extra text beyond the ID
        const cleaned = line
          .replace(/^\s*[-*•]\s*/, "")
          .replace(new RegExp(DOC_REF_REGEX.source, "g"), "")
          .replace(/^\s*[—–-:]\s*/, "")
          .trim();
        rels.push({
          to_doc_id_external: key,
          relationship_type: skipping,
          notes: cleaned.length > 0 ? cleaned : null,
        });
      }
      continue;
    }

    body.push(line);
  }

  return { bodyLines: body, relationships: rels };
}

/** Try to extract a ROP-XXX-### code from a Drive filename. */
export function docIdFromFilename(name: string): string | null {
  const m = name.match(/\bROP-(?:POL|SOP|FRM|SAF|TRN|DSC)-\d{3}\b/);
  return m ? m[0].toUpperCase() : null;
}
