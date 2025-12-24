import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CURRENT_DISCLAIMER_VERSION = "v1.0";

interface DisclaimerAcceptance {
  id: string;
  user_id: string;
  disclaimer_version: string;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export const useDisclaimerAcceptance = () => {
  const { user, isAdmin } = useAuth();
  const [acceptance, setAcceptance] = useState<DisclaimerAcceptance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAcceptance = useCallback(async () => {
    if (!user?.id || !isAdmin) {
      setAcceptance(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("disclaimer_acceptances")
        .select("*")
        .eq("user_id", user.id)
        .eq("disclaimer_version", CURRENT_DISCLAIMER_VERSION)
        .maybeSingle();

      if (error) throw error;
      setAcceptance(data);
    } catch (error) {
      console.error("Error fetching disclaimer acceptance:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin]);

  useEffect(() => {
    fetchAcceptance();
  }, [fetchAcceptance]);

  const acceptDisclaimer = async () => {
    if (!user?.id || !isAdmin) return { error: new Error("Unauthorized") };

    try {
      const { data, error } = await supabase
        .from("disclaimer_acceptances")
        .insert({
          user_id: user.id,
          disclaimer_version: CURRENT_DISCLAIMER_VERSION,
          user_agent: navigator.userAgent,
        })
        .select()
        .single();

      if (error) throw error;
      setAcceptance(data);
      return { data, error: null };
    } catch (error) {
      console.error("Error accepting disclaimer:", error);
      return { data: null, error };
    }
  };

  return {
    acceptance,
    loading,
    hasAccepted: !!acceptance,
    acceptDisclaimer,
    currentVersion: CURRENT_DISCLAIMER_VERSION,
    refreshAcceptance: fetchAcceptance,
  };
};
