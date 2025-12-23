import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SOPProgress {
  sop_key: string;
  completed: boolean;
  completed_at: string | null;
  points_earned: number;
}

export const useSOPProgress = () => {
  const { user } = useAuth();
  const [sopProgress, setSOPProgress] = useState<SOPProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSOPProgress = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("sop_quiz_progress")
        .select("sop_key, completed, completed_at, points_earned")
        .eq("user_id", user.id);

      if (error) throw error;
      setSOPProgress(data || []);
    } catch (error) {
      console.error("Error fetching SOP progress:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSOPProgress();
    }
  }, [user, fetchSOPProgress]);

  const isSOPCompleted = (sopKey: string): boolean => {
    return sopProgress.some((p) => p.sop_key === sopKey && p.completed);
  };

  const getCompletedSOPCount = (): number => {
    return sopProgress.filter((p) => p.completed).length;
  };

  const getTotalPointsEarned = (): number => {
    return sopProgress.reduce((sum, p) => sum + (p.points_earned || 0), 0);
  };

  const refreshProgress = useCallback(async () => {
    await fetchSOPProgress();
  }, [fetchSOPProgress]);

  return {
    sopProgress,
    loading,
    isSOPCompleted,
    getCompletedSOPCount,
    getTotalPointsEarned,
    refreshProgress,
  };
};
