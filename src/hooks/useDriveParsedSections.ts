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

const TABLE_MAP: Record<ModuleType, "company_sops" | "company_policies" | "company_safety" | "company_training" | "company_disciplinary" | "company_forms"> = {
  sops: "company_sops",
  policies: "company_policies",
  safety: "company_safety",
  training: "company_training",
  disciplinary: "company_disciplinary",
  forms: "company_forms",
};

/**
 * Fetches parsed_sections for a Drive file by looking up the matching company_* row
 * via drive_file_id. Returns null when no row is found or parsed_sections is absent.
 */
export function useDriveParsedSections(driveFileId: string | null | undefined, moduleType: ModuleType) {
  return useQuery({
    queryKey: ["drive-parsed-sections", moduleType, driveFileId],
    enabled: !!driveFileId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ParsedSections | null> => {
      const table = TABLE_MAP[moduleType];
      const { data, error } = await supabase
        .from(table)
        .select("parsed_sections")
        .eq("drive_file_id", driveFileId!)
        .maybeSingle();
      if (error) {
        console.warn("useDriveParsedSections:", error.message);
        return null;
      }
      return (data?.parsed_sections as ParsedSections | null) ?? null;
    },
  });
}
