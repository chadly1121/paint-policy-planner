import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Determines whether the guided first-session onboarding wizard should be shown.
 * Shown when: profile.onboarding_completed_at IS NULL AND section_progress is empty.
 * Admins are excluded (they manage the org, they don't need the new-hire flow).
 */
export const useOnboardingStatus = () => {
  const { user, isAdmin } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!user?.id || isAdmin) {
      setShouldShow(false);
      setLoading(false);
      return;
    }
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.onboarding_completed_at) {
        setShouldShow(false);
        return;
      }

      const { count } = await supabase
        .from("section_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      setShouldShow((count ?? 0) === 0);
    } catch (e) {
      console.error("useOnboardingStatus error", e);
      setShouldShow(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin]);

  useEffect(() => {
    check();
  }, [check]);

  const dismiss = useCallback(async () => {
    setShouldShow(false);
    if (!user?.id) return;
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("user_id", user.id);
    } catch (e) {
      console.error("Failed to persist onboarding dismissal", e);
    }
  }, [user?.id]);

  return { shouldShow, loading, refresh: check, dismiss };
};
