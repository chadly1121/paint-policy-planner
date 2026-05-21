// Hook for reading + writing document relationships for a given source doc.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExtractedRelationship } from "@/lib/documentRelationships";

export type DocRelationshipType = "related" | "suggested_next" | "depends_on" | "replaces";

export interface DocumentRelationship {
  id: string;
  org_id: string;
  from_doc_id_external: string;
  to_doc_id_external: string;
  relationship_type: DocRelationshipType;
  notes: string | null;
  source: string;
  created_at: string;
}

export function useDocumentRelationships(fromDocIdExternal: string | null | undefined) {
  return useQuery({
    queryKey: ["document-relationships", fromDocIdExternal],
    enabled: !!fromDocIdExternal,
    queryFn: async (): Promise<DocumentRelationship[]> => {
      const { data, error } = await supabase
        .from("document_relationships")
        .select("*")
        .eq("from_doc_id_external", fromDocIdExternal!)
        .order("relationship_type")
        .order("to_doc_id_external");
      if (error) throw error;
      return (data ?? []) as DocumentRelationship[];
    },
  });
}

export function useAllOrgRelationships() {
  return useQuery({
    queryKey: ["document-relationships-all"],
    queryFn: async (): Promise<DocumentRelationship[]> => {
      const { data, error } = await supabase
        .from("document_relationships")
        .select("*")
        .order("from_doc_id_external")
        .order("relationship_type");
      if (error) throw error;
      return (data ?? []) as DocumentRelationship[];
    },
  });
}

export function useUpsertRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      org_id: string;
      from_doc_id_external: string;
      to_doc_id_external: string;
      relationship_type: DocRelationshipType;
      notes?: string | null;
      source?: string;
    }) => {
      const { error } = await supabase
        .from("document_relationships")
        .upsert(
          {
            org_id: input.org_id,
            from_doc_id_external: input.from_doc_id_external.toUpperCase(),
            to_doc_id_external: input.to_doc_id_external.toUpperCase(),
            relationship_type: input.relationship_type,
            notes: input.notes ?? null,
            source: input.source ?? "manual",
          },
          { onConflict: "org_id,from_doc_id_external,to_doc_id_external,relationship_type" }
        );
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["document-relationships", vars.from_doc_id_external] });
      qc.invalidateQueries({ queryKey: ["document-relationships-all"] });
    },
  });
}

export function useDeleteRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("document_relationships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-relationships"] });
      qc.invalidateQueries({ queryKey: ["document-relationships-all"] });
    },
  });
}

/** Bulk-insert auto-extracted relationships (admin-only, idempotent via unique constraint). */
export function useSyncAutoRelationships() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      org_id: string;
      from_doc_id_external: string;
      extracted: ExtractedRelationship[];
    }) => {
      if (input.extracted.length === 0) return;
      const rows = input.extracted.map((r) => ({
        org_id: input.org_id,
        from_doc_id_external: input.from_doc_id_external.toUpperCase(),
        to_doc_id_external: r.to_doc_id_external,
        relationship_type: r.relationship_type,
        notes: r.notes,
        source: "auto",
      }));
      const { error } = await supabase
        .from("document_relationships")
        .upsert(rows, {
          onConflict: "org_id,from_doc_id_external,to_doc_id_external,relationship_type",
          ignoreDuplicates: true,
        });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["document-relationships", vars.from_doc_id_external] });
    },
  });
}
