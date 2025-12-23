import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SectionProgress {
  section_key: string;
  completed: boolean;
  completed_at: string | null;
}

interface PointsBalance {
  total_points: number;
  redeemed_points: number;
  available_points: number;
}

interface LeaderboardEntry {
  full_name: string;
  total_points: number;
  available_points: number;
  sections_completed: number;
}

export const useProgress = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<SectionProgress[]>([]);
  const [points, setPoints] = useState<PointsBalance | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const SECTIONS = ["sops", "safety", "policies", "training", "disciplinary"];

  const fetchProgress = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("section_progress")
        .select("*")
        .eq("user_id", user.id);

      setProgress(data || []);
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  }, [user]);

  const fetchPoints = useCallback(async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("points_balance")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setPoints({
          total_points: data.total_points,
          redeemed_points: data.redeemed_points,
          available_points: data.available_points ?? (data.total_points - data.redeemed_points),
        });
      }
    } catch (error) {
      console.error("Error fetching points:", error);
    }
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      // Use the secure leaderboard view that doesn't expose emails
      const { data, error } = await supabase
        .from("leaderboard_view")
        .select("*");

      if (error) {
        // Fallback to the RPC function if view fails
        console.log("Falling back to RPC for leaderboard");
        const { data: rpcData } = await supabase.rpc("get_leaderboard");
        setLeaderboard(rpcData || []);
      } else {
        setLeaderboard(data || []);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchProgress(), fetchPoints(), fetchLeaderboard()]).finally(() => {
        setLoading(false);
      });
    }
  }, [user, fetchProgress, fetchPoints, fetchLeaderboard]);

  const getSectionProgress = (sectionKey: string): SectionProgress | null => {
    return progress.find((p) => p.section_key === sectionKey) || null;
  };

  const isSectionUnlocked = (sectionKey: string): boolean => {
    const sectionIndex = SECTIONS.indexOf(sectionKey);
    if (sectionIndex === 0) return true; // First section always unlocked

    const previousSection = SECTIONS[sectionIndex - 1];
    const previousProgress = getSectionProgress(previousSection);
    return previousProgress?.completed === true;
  };

  const getCompletedSectionsCount = (): number => {
    return progress.filter((p) => p.completed).length;
  };

  const refreshData = useCallback(async () => {
    await Promise.all([fetchProgress(), fetchPoints(), fetchLeaderboard()]);
  }, [fetchProgress, fetchPoints, fetchLeaderboard]);

  return {
    progress,
    points,
    leaderboard,
    loading,
    getSectionProgress,
    isSectionUnlocked,
    getCompletedSectionsCount,
    refreshData,
    SECTIONS,
  };
};
