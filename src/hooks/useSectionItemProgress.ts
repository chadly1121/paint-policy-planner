import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ItemProgress {
  item_key: string;
  completed: boolean;
  completed_at: string | null;
  points_earned: number;
}

export const useSectionItemProgress = (sectionKey: string) => {
  const { user } = useAuth();
  const [itemProgress, setItemProgress] = useState<ItemProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItemProgress = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("section_item_progress")
        .select("item_key, completed, completed_at, points_earned")
        .eq("user_id", user.id)
        .eq("section_key", sectionKey);

      if (error) throw error;
      setItemProgress(data || []);
    } catch (error) {
      console.error("Error fetching item progress:", error);
    } finally {
      setLoading(false);
    }
  }, [user, sectionKey]);

  useEffect(() => {
    if (user) {
      fetchItemProgress();
    }
  }, [user, fetchItemProgress]);

  const isItemCompleted = (itemKey: string): boolean => {
    return itemProgress.some((p) => p.item_key === itemKey && p.completed);
  };

  const getCompletedItemCount = (): number => {
    return itemProgress.filter((p) => p.completed).length;
  };

  const getTotalPointsEarned = (): number => {
    return itemProgress.reduce((sum, p) => sum + (p.points_earned || 0), 0);
  };

  const refreshProgress = useCallback(async () => {
    await fetchItemProgress();
  }, [fetchItemProgress]);

  return {
    itemProgress,
    loading,
    isItemCompleted,
    getCompletedItemCount,
    getTotalPointsEarned,
    refreshProgress,
  };
};
