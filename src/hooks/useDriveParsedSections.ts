import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ParsedSections = {
  purpose?: string | null;
  scope?: string | null;
  non_negotiables?: string[] | null;
  policy_statement?: string | null;
  procedure_steps?: string[] | null;
  tools_required?: string[] | null;
  quality_check?: string | null;
  common_mistakes?: string[] | null;
  responsibilities?: Array<{ role: string; duties: string }> | null;
  consequences?: string | null;
  acknowledgement?: string | null;
};

type ModuleType = "sops" | "policies" | "safety" | "training" | "disciplinary" | "forms";

/**
 * Fetches parsed_sections for a Drive file by looking up the matching company_* row.
 * Most company_* tables expose drive_file_id; company_sops lacks it, so we fall back
 * to doc_id_external (ROP-SOP-### derived from filename) for that module.
 */
export function useDriveParsedSections(
  driveFileId: string | null | undefined,
  moduleType: ModuleType,
  docIdExternal?: string | null,
) {
  return useQuery({
    queryKey: ["drive-parsed-sections", moduleType, driveFileId, docIdExternal],
    enabled: !!driveFileId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ParsedSections | null> => {
      let query;
      if (moduleType === "sops") {
        if (!docIdExternal) return null;
        query = supabase
          .from("company_sops")
          .select("parsed_sections")
          .eq("doc_id_external", docIdExternal)
          .maybeSingle();
      } else {
        const table = {
          policies: "company_policies",
          safety: "company_safety",
          training: "company_training",
          disciplinary: "company_disciplinary",
          forms: "company_forms",
        }[moduleType] as
          | "company_policies"
          | "company_safety"
          | "company_training"
          | "company_disciplinary"
          | "company_forms";
        query = supabase
          .from(table)
          .select("parsed_sections")
          .eq("drive_file_id", driveFileId!)
          .maybeSingle();
      }
      const { data, error } = await query;
      if (error) {
        console.warn("useDriveParsedSections:", error.message);
        return null;
      }
      return (data?.parsed_sections as ParsedSections | null) ?? null;
    },
  });
}
