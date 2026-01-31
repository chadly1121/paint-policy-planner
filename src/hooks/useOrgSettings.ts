import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

interface OrgSettings {
  id: string;
  org_id: string;
  cert_reminder_days_first: number;
  cert_reminder_days_urgent: number;
  cert_reminder_frequency_days: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS = {
  cert_reminder_days_first: 30,
  cert_reminder_days_urgent: 14,
  cert_reminder_frequency_days: 7,
};

export const useOrgSettings = () => {
  const { org, isOrgAdmin } = useOrganization();
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!org?.id) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("org_settings")
        .select("*")
        .eq("org_id", org.id)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error("Error fetching org settings:", error);
    } finally {
      setLoading(false);
    }
  }, [org?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (
    updates: Partial<Pick<OrgSettings, "cert_reminder_days_first" | "cert_reminder_days_urgent" | "cert_reminder_frequency_days">>
  ): Promise<{ error: Error | null }> => {
    if (!org?.id || !isOrgAdmin) {
      return { error: new Error("Not authorized") };
    }

    try {
      if (settings) {
        // Update existing
        const { error } = await supabase
          .from("org_settings")
          .update(updates)
          .eq("org_id", org.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("org_settings")
          .insert({
            org_id: org.id,
            ...DEFAULT_SETTINGS,
            ...updates,
          });

        if (error) throw error;
      }

      await fetchSettings();
      return { error: null };
    } catch (error) {
      console.error("Error updating org settings:", error);
      return { error: error as Error };
    }
  };

  // Return effective settings (actual or defaults)
  const effectiveSettings = {
    cert_reminder_days_first: settings?.cert_reminder_days_first ?? DEFAULT_SETTINGS.cert_reminder_days_first,
    cert_reminder_days_urgent: settings?.cert_reminder_days_urgent ?? DEFAULT_SETTINGS.cert_reminder_days_urgent,
    cert_reminder_frequency_days: settings?.cert_reminder_frequency_days ?? DEFAULT_SETTINGS.cert_reminder_frequency_days,
  };

  return {
    settings,
    effectiveSettings,
    loading,
    updateSettings,
    refresh: fetchSettings,
    isOrgAdmin,
  };
};
