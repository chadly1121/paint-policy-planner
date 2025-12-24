import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CompanySettings {
  id: string;
  user_id: string;
  enable_custom_sops: boolean;
  enable_custom_policies: boolean;
  created_at: string;
  updated_at: string;
}

export const useCompanySettings = () => {
  const { user, isAdmin } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user?.id || !isAdmin) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error("Error fetching company settings:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<Pick<CompanySettings, 'enable_custom_sops' | 'enable_custom_policies'>>) => {
    if (!user?.id || !isAdmin) return { error: new Error("Unauthorized") };

    try {
      if (settings) {
        // Update existing settings
        const { data, error } = await supabase
          .from("company_settings")
          .update(updates)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
        return { data, error: null };
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from("company_settings")
          .insert({
            user_id: user.id,
            ...updates,
          })
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
        return { data, error: null };
      }
    } catch (error) {
      console.error("Error updating company settings:", error);
      return { data: null, error };
    }
  };

  return {
    settings,
    loading,
    updateSettings,
    refreshSettings: fetchSettings,
    enableCustomSOPs: settings?.enable_custom_sops ?? false,
    enableCustomPolicies: settings?.enable_custom_policies ?? false,
  };
};
