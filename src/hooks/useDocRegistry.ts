// Builds a registry of every document the current user can see, keyed by doc_id_external (e.g., ROP-POL-006).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DocCategory = "POL" | "SOP" | "FRM" | "SAF" | "TRN" | "DSC";
export type DocModuleType = "policies" | "sops" | "forms" | "safety" | "training" | "disciplinary";

export interface DocRegistryEntry {
  doc_id_external: string;
  title: string;
  category: DocCategory;
  moduleType: DocModuleType;
  route: string;
  drive_file_id: string | null;
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

const CATEGORY_MODULE: Record<DocCategory, DocModuleType> = {
  POL: "policies",
  SOP: "sops",
  FRM: "forms",
  SAF: "safety",
  TRN: "training",
  DSC: "disciplinary",
};

type TableName =
  | "company_policies"
  | "company_sops"
  | "company_forms"
  | "company_safety"
  | "company_training"
  | "company_disciplinary";

const TABLES: { table: TableName; category: DocCategory; hasDriveFileId: boolean }[] = [
  { table: "company_policies", category: "POL", hasDriveFileId: true },
  { table: "company_sops", category: "SOP", hasDriveFileId: false },
  { table: "company_forms", category: "FRM", hasDriveFileId: true },
  { table: "company_safety", category: "SAF", hasDriveFileId: true },
  { table: "company_training", category: "TRN", hasDriveFileId: true },
  { table: "company_disciplinary", category: "DSC", hasDriveFileId: true },
];

export function useDocRegistry() {
  return useQuery({
    queryKey: ["doc-registry"],
    staleTime: 60_000,
    queryFn: async (): Promise<Map<string, DocRegistryEntry>> => {
      const map = new Map<string, DocRegistryEntry>();
      await Promise.all(
        TABLES.map(async ({ table, category, hasDriveFileId }) => {
          const select = hasDriveFileId
            ? "doc_id_external, title, drive_file_id"
            : "doc_id_external, title";
          const { data, error } = await supabase
            .from(table)
            .select(select)
            .not("doc_id_external", "is", null);
          if (error || !data) return;
          for (const row of data as Array<{
            doc_id_external: string | null;
            title: string;
            drive_file_id?: string | null;
          }>) {
            if (!row.doc_id_external) continue;
            const key = row.doc_id_external.toUpperCase();
            if (!map.has(key)) {
              map.set(key, {
                doc_id_external: key,
                title: row.title,
                category,
                moduleType: CATEGORY_MODULE[category],
                route: `${CATEGORY_ROUTE[category]}?docId=${key}`,
                drive_file_id: row.drive_file_id ?? null,
              });
            }
          }
        })
      );

      // SOPs lack drive_file_id on company_sops; backfill from sops table.
      const sopIds = Array.from(map.values())
        .filter((e) => e.category === "SOP" && !e.drive_file_id)
        .map((e) => e.doc_id_external);
      if (sopIds.length > 0) {
        const { data } = await supabase
          .from("sops")
          .select("doc_id_external, drive_file_id")
          .in("doc_id_external", sopIds)
          .not("drive_file_id", "is", null);
        for (const row of data ?? []) {
          if (!row.doc_id_external || !row.drive_file_id) continue;
          const key = row.doc_id_external.toUpperCase();
          const entry = map.get(key);
          if (entry) entry.drive_file_id = row.drive_file_id;
        }
      }

      return map;
    },
  });
}
