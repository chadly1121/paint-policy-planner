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

export const useCompanyContent = () => {
  const { user } = useAuth();
  const [companySops, setCompanySops] = useState<CompanySOP[]>([]);
  const [companyPolicies, setCompanyPolicies] = useState<CompanyPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContent = useCallback(async () => {
    if (!user?.id) {
      setCompanySops([]);
      setCompanyPolicies([]);
      setLoading(false);
      return;
    }

    try {
      const [sopsResult, policiesResult] = await Promise.all([
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
      ]);

      if (sopsResult.error) throw sopsResult.error;
      if (policiesResult.error) throw policiesResult.error;

      setCompanySops(sopsResult.data || []);
      setCompanyPolicies(policiesResult.data || []);
    } catch (error) {
      console.error("Error fetching company content:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const getCompanySOP = (sourceKey: string) => {
    return companySops.find((sop) => sop.source_sop_key === sourceKey);
  };

  const getCompanyPolicy = (sourceKey: string) => {
    return companyPolicies.find((policy) => policy.source_policy_key === sourceKey);
  };

  const upsertCompanySOP = async (
    sourceKey: string,
    title: string,
    content: string
  ) => {
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
          .insert({
            user_id: user.id,
            source_sop_key: sourceKey,
            title,
            content,
          })
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

  const upsertCompanyPolicy = async (
    sourceKey: string,
    title: string,
    content: string
  ) => {
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
          .insert({
            user_id: user.id,
            source_policy_key: sourceKey,
            title,
            content,
          })
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
      console.error("Error resetting SOP to system content:", error);
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
      console.error("Error resetting policy to system content:", error);
      return { error };
    }
  };

  return {
    companySops,
    companyPolicies,
    loading,
    getCompanySOP,
    getCompanyPolicy,
    upsertCompanySOP,
    upsertCompanyPolicy,
    resetSOPToSystem,
    resetPolicyToSystem,
    refreshContent: fetchContent,
  };
};
