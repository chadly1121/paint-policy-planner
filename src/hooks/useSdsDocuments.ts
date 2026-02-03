import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export interface SdsDocument {
  id: string;
  org_id: string;
  product_name: string;
  manufacturer: string | null;
  hazard_category: string | null;
  drive_file_id: string | null;
  external_url: string | null;
  revision_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type HazardCategory = 
  | "flammable" 
  | "corrosive" 
  | "toxic" 
  | "irritant" 
  | "oxidizer" 
  | "compressed_gas" 
  | "health_hazard" 
  | "environmental";

export const HAZARD_CATEGORIES: { value: HazardCategory; label: string; icon: string }[] = [
  { value: "flammable", label: "Flammable", icon: "🔥" },
  { value: "corrosive", label: "Corrosive", icon: "⚗️" },
  { value: "toxic", label: "Toxic", icon: "☠️" },
  { value: "irritant", label: "Irritant", icon: "⚠️" },
  { value: "oxidizer", label: "Oxidizer", icon: "🔵" },
  { value: "compressed_gas", label: "Compressed Gas", icon: "💨" },
  { value: "health_hazard", label: "Health Hazard", icon: "🏥" },
  { value: "environmental", label: "Environmental", icon: "🌍" },
];

export interface SdsFilters {
  search: string;
  hazardCategory: string;
}

export function useSdsDocuments(filters: SdsFilters = { search: "", hazardCategory: "" }) {
  const { org } = useOrg();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ["sds-documents", org?.id],
    queryFn: async () => {
      if (!org?.id) return [];
      
      const { data, error } = await supabase
        .from("sds_documents")
        .select("*")
        .eq("org_id", org.id)
        .eq("is_active", true)
        .order("product_name", { ascending: true });

      if (error) throw error;
      return data as SdsDocument[];
    },
    enabled: !!org?.id,
  });

  // Client-side filtering for search and hazard category
  const filteredDocuments = useMemo(() => {
    let result = documents;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.product_name.toLowerCase().includes(searchLower) ||
          (doc.manufacturer && doc.manufacturer.toLowerCase().includes(searchLower))
      );
    }

    if (filters.hazardCategory) {
      result = result.filter((doc) => doc.hazard_category === filters.hazardCategory);
    }

    return result;
  }, [documents, filters.search, filters.hazardCategory]);

  const addDocument = useMutation({
    mutationFn: async (doc: Omit<SdsDocument, "id" | "created_at" | "updated_at" | "org_id" | "is_active">) => {
      if (!org?.id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("sds_documents")
        .insert({
          ...doc,
          org_id: org.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sds-documents", org?.id] });
      toast.success("SDS document added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add document: ${error.message}`);
    },
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SdsDocument> & { id: string }) => {
      const { data, error } = await supabase
        .from("sds_documents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sds-documents", org?.id] });
      toast.success("SDS document updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update document: ${error.message}`);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from("sds_documents")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sds-documents", org?.id] });
      toast.success("SDS document removed");
    },
    onError: (error) => {
      toast.error(`Failed to remove document: ${error.message}`);
    },
  });

  return {
    documents: filteredDocuments,
    allDocuments: documents,
    isLoading,
    error,
    addDocument,
    updateDocument,
    deleteDocument,
  };
}
