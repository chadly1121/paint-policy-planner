import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CompanySOP {
  id: string;
  user_id: string;
  source_sop_key: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  version: number;
  edited_by: string | null;
  change_summary: string | null;
}

export interface CompanyPolicy {
  id: string;
  user_id: string;
  source_policy_key: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  version: number;
  edited_by: string | null;
  change_summary: string | null;
}

export interface CompanyTraining {
  id: string;
  user_id: string;
  source_training_key: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  version: number;
  edited_by: string | null;
  change_summary: string | null;
}

export interface CompanySafety {
  id: string;
  user_id: string;
  source_safety_key: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  version: number;
  edited_by: string | null;
  change_summary: string | null;
}

export interface CompanyDisciplinary {
  id: string;
  user_id: string;
  source_disciplinary_key: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  version: number;
  edited_by: string | null;
  change_summary: string | null;
}

export type ContentType = 'sops' | 'policies' | 'training' | 'safety' | 'disciplinary';

export const useCompanyContent = () => {
  const { user } = useAuth();
  const [companySops, setCompanySops] = useState<CompanySOP[]>([]);
  const [companyPolicies, setCompanyPolicies] = useState<CompanyPolicy[]>([]);
  const [companyTraining, setCompanyTraining] = useState<CompanyTraining[]>([]);
  const [companySafety, setCompanySafety] = useState<CompanySafety[]>([]);
  const [companyDisciplinary, setCompanyDisciplinary] = useState<CompanyDisciplinary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContent = useCallback(async () => {
    if (!user?.id) {
      setCompanySops([]);
      setCompanyPolicies([]);
      setCompanyTraining([]);
      setCompanySafety([]);
      setCompanyDisciplinary([]);
      setLoading(false);
      return;
    }

    try {
      const [sopsResult, policiesResult, trainingResult, safetyResult, disciplinaryResult] = await Promise.all([
        supabase
          .from("company_sops")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true),
        supabase
          .from("company_policies")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true),
        supabase
          .from("company_training")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true),
        supabase
          .from("company_safety")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true),
        supabase
          .from("company_disciplinary")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true),
      ]);

      if (sopsResult.error) throw sopsResult.error;
      if (policiesResult.error) throw policiesResult.error;
      if (trainingResult.error) throw trainingResult.error;
      if (safetyResult.error) throw safetyResult.error;
      if (disciplinaryResult.error) throw disciplinaryResult.error;

      setCompanySops(sopsResult.data || []);
      setCompanyPolicies(policiesResult.data || []);
      setCompanyTraining(trainingResult.data || []);
      setCompanySafety(safetyResult.data || []);
      setCompanyDisciplinary(disciplinaryResult.data || []);
    } catch (error) {
      console.error("Error fetching company content:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Getters
  const getCompanySOP = (sourceKey: string) => companySops.find((sop) => sop.source_sop_key === sourceKey);
  const getCompanyPolicy = (sourceKey: string) => companyPolicies.find((policy) => policy.source_policy_key === sourceKey);
  const getCompanyTraining = (sourceKey: string) => companyTraining.find((t) => t.source_training_key === sourceKey);
  const getCompanySafety = (sourceKey: string) => companySafety.find((s) => s.source_safety_key === sourceKey);
  const getCompanyDisciplinary = (sourceKey: string) => companyDisciplinary.find((d) => d.source_disciplinary_key === sourceKey);

  // Upsert methods for each content type
  const upsertCompanySOP = async (sourceKey: string, title: string, content: string) => {
    if (!user?.id) return { error: new Error("Unauthorized") };
    try {
      const existing = getCompanySOP(sourceKey);
      if (existing) {
        const { data, error } = await supabase
          .from("company_sops")
          .update({ title, content })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        await fetchContent();
        return { data, error: null };
      } else {
        const { data, error } = await supabase
          .from("company_sops")
          .insert({ user_id: user.id, source_sop_key: sourceKey, title, content })
          .select()
          .single();
        if (error) throw error;
        await fetchContent();
        return { data, error: null };
      }
    } catch (error) {
      console.error("Error upserting company SOP:", error);
      return { data: null, error };
    }
  };

  const upsertCompanyPolicy = async (sourceKey: string, title: string, content: string) => {
    if (!user?.id) return { error: new Error("Unauthorized") };
    try {
      const existing = getCompanyPolicy(sourceKey);
      if (existing) {
        const { data, error } = await supabase
          .from("company_policies")
          .update({ title, content })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        await fetchContent();
        return { data, error: null };
      } else {
        const { data, error } = await supabase
          .from("company_policies")
          .insert({ user_id: user.id, source_policy_key: sourceKey, title, content })
          .select()
          .single();
        if (error) throw error;
        await fetchContent();
        return { data, error: null };
      }
    } catch (error) {
      console.error("Error upserting company policy:", error);
      return { data: null, error };
    }
  };

  const upsertCompanyTrainingContent = async (sourceKey: string, title: string, content: string) => {
    if (!user?.id) return { error: new Error("Unauthorized") };
    try {
      const existing = getCompanyTraining(sourceKey);
      if (existing) {
        const { data, error } = await supabase
          .from("company_training")
          .update({ title, content })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        await fetchContent();
        return { data, error: null };
      } else {
        const { data, error } = await supabase
          .from("company_training")
          .insert({ user_id: user.id, source_training_key: sourceKey, title, content })
          .select()
          .single();
        if (error) throw error;
        await fetchContent();
        return { data, error: null };
      }
    } catch (error) {
      console.error("Error upserting company training:", error);
      return { data: null, error };
    }
  };

  const upsertCompanySafetyContent = async (sourceKey: string, title: string, content: string) => {
    if (!user?.id) return { error: new Error("Unauthorized") };
    try {
      const existing = getCompanySafety(sourceKey);
      if (existing) {
        const { data, error } = await supabase
          .from("company_safety")
          .update({ title, content })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        await fetchContent();
        return { data, error: null };
      } else {
        const { data, error } = await supabase
          .from("company_safety")
          .insert({ user_id: user.id, source_safety_key: sourceKey, title, content })
          .select()
          .single();
        if (error) throw error;
        await fetchContent();
        return { data, error: null };
      }
    } catch (error) {
      console.error("Error upserting company safety:", error);
      return { data: null, error };
    }
  };

  const upsertCompanyDisciplinaryContent = async (sourceKey: string, title: string, content: string) => {
    if (!user?.id) return { error: new Error("Unauthorized") };
    try {
      const existing = getCompanyDisciplinary(sourceKey);
      if (existing) {
        const { data, error } = await supabase
          .from("company_disciplinary")
          .update({ title, content })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        await fetchContent();
        return { data, error: null };
      } else {
        const { data, error } = await supabase
          .from("company_disciplinary")
          .insert({ user_id: user.id, source_disciplinary_key: sourceKey, title, content })
          .select()
          .single();
        if (error) throw error;
        await fetchContent();
        return { data, error: null };
      }
    } catch (error) {
      console.error("Error upserting company disciplinary:", error);
      return { data: null, error };
    }
  };

  // Reset methods
  const resetSOPToSystem = async (sourceKey: string) => {
    if (!user?.id) return { error: new Error("Unauthorized") };
    try {
      const { error } = await supabase
        .from("company_sops")
        .delete()
        .eq("user_id", user.id)
        .eq("source_sop_key", sourceKey);
      if (error) throw error;
      await fetchContent();
      return { error: null };
    } catch (error) {
      console.error("Error resetting SOP:", error);
      return { error };
    }
  };

  const resetPolicyToSystem = async (sourceKey: string) => {
    if (!user?.id) return { error: new Error("Unauthorized") };
    try {
      const { error } = await supabase
        .from("company_policies")
        .delete()
        .eq("user_id", user.id)
        .eq("source_policy_key", sourceKey);
      if (error) throw error;
      await fetchContent();
      return { error: null };
    } catch (error) {
      console.error("Error resetting policy:", error);
      return { error };
    }
  };

  const resetTrainingToSystem = async (sourceKey: string) => {
    if (!user?.id) return { error: new Error("Unauthorized") };
    try {
      const { error } = await supabase
        .from("company_training")
        .delete()
        .eq("user_id", user.id)
        .eq("source_training_key", sourceKey);
      if (error) throw error;
      await fetchContent();
      return { error: null };
    } catch (error) {
      console.error("Error resetting training:", error);
      return { error };
    }
  };

  const resetSafetyToSystem = async (sourceKey: string) => {
    if (!user?.id) return { error: new Error("Unauthorized") };
    try {
      const { error } = await supabase
        .from("company_safety")
        .delete()
        .eq("user_id", user.id)
        .eq("source_safety_key", sourceKey);
      if (error) throw error;
      await fetchContent();
      return { error: null };
    } catch (error) {
      console.error("Error resetting safety:", error);
      return { error };
    }
  };

  const resetDisciplinaryToSystem = async (sourceKey: string) => {
    if (!user?.id) return { error: new Error("Unauthorized") };
    try {
      const { error } = await supabase
        .from("company_disciplinary")
        .delete()
        .eq("user_id", user.id)
        .eq("source_disciplinary_key", sourceKey);
      if (error) throw error;
      await fetchContent();
      return { error: null };
    } catch (error) {
      console.error("Error resetting disciplinary:", error);
      return { error };
    }
  };

  // Generic upsert/reset by content type
  const upsertContent = async (type: ContentType, sourceKey: string, title: string, content: string) => {
    switch (type) {
      case 'sops': return upsertCompanySOP(sourceKey, title, content);
      case 'policies': return upsertCompanyPolicy(sourceKey, title, content);
      case 'training': return upsertCompanyTrainingContent(sourceKey, title, content);
      case 'safety': return upsertCompanySafetyContent(sourceKey, title, content);
      case 'disciplinary': return upsertCompanyDisciplinaryContent(sourceKey, title, content);
    }
  };

  const resetContent = async (type: ContentType, sourceKey: string) => {
    switch (type) {
      case 'sops': return resetSOPToSystem(sourceKey);
      case 'policies': return resetPolicyToSystem(sourceKey);
      case 'training': return resetTrainingToSystem(sourceKey);
      case 'safety': return resetSafetyToSystem(sourceKey);
      case 'disciplinary': return resetDisciplinaryToSystem(sourceKey);
    }
  };

  return {
    // Data
    companySops,
    companyPolicies,
    companyTraining,
    companySafety,
    companyDisciplinary,
    loading,
    // Getters
    getCompanySOP,
    getCompanyPolicy,
    getCompanyTraining,
    getCompanySafety,
    getCompanyDisciplinary,
    // Generic methods
    upsertContent,
    resetContent,
    // Specific methods
    upsertCompanySOP,
    upsertCompanyPolicy,
    upsertCompanyTrainingContent,
    upsertCompanySafetyContent,
    upsertCompanyDisciplinaryContent,
    resetSOPToSystem,
    resetPolicyToSystem,
    resetTrainingToSystem,
    resetSafetyToSystem,
    resetDisciplinaryToSystem,
    // Refresh
    refreshContent: fetchContent,
  };
};
