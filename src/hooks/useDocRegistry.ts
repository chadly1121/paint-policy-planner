// Builds a registry of every document the current user can see, keyed by doc_id_external (e.g., ROP-POL-006).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DocCategory = "POL" | "SOP" | "FRM" | "SAF" | "TRN" | "DSC";

export interface DocRegistryEntry {
  doc_id_external: string;
  title: string;
  category: DocCategory;
  route: string;
}

export const DOC_REF_REGEX = /\bROP-(POL|SOP|FRM|SAF|TRN|DSC)-\d{3}\b/g;

const CATEGORY_ROUTE: Record<DocCategory, string> = {
  POL: "/policies",
  SOP: "/sops",
  FRM: "/forms",
  SAF: "/safety",
  TRN: "/training",
  DSC: "/disciplinary",
};

const TABLES: { table: "company_policies" | "company_sops" | "company_forms" | "company_safety" | "company_training" | "company_disciplinary"; category: DocCategory }[] = [
  { table: "company_policies", category: "POL" },
  { table: "company_sops", category: "SOP" },
  { table: "company_forms", category: "FRM" },
  { table: "company_safety", category: "SAF" },
  { table: "company_training", category: "TRN" },
  { table: "company_disciplinary", category: "DSC" },
];

export function useDocRegistry() {
  return useQuery({
    queryKey: ["doc-registry"],
    staleTime: 60_000,
    queryFn: async (): Promise<Map<string, DocRegistryEntry>> => {
      const map = new Map<string, DocRegistryEntry>();
      await Promise.all(
        TABLES.map(async ({ table, category }) => {
          const { data, error } = await supabase
            .from(table)
            .select("doc_id_external, title")
            .not("doc_id_external", "is", null);
          if (error || !data) return;
          for (const row of data as Array<{ doc_id_external: string | null; title: string }>) {
            if (!row.doc_id_external) continue;
            const key = row.doc_id_external.toUpperCase();
            if (!map.has(key)) {
              map.set(key, {
                doc_id_external: key,
                title: row.title,
                category,
                route: `${CATEGORY_ROUTE[category]}?docId=${key}`,
              });
            }
          }
        })
      );
      return map;
    },
  });
}
