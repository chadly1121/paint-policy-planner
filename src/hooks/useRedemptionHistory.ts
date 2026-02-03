import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RedemptionRequest {
  id: string;
  item_name: string | null;
  points_requested: number;
  status: string;
  created_at: string;
  processed_at: string | null;
  admin_notes: string | null;
}

export const useRedemptionHistory = () => {
  const { user } = useAuth();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["redemption-history", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("redemption_requests")
        .select("id, item_name, points_requested, status, created_at, processed_at, admin_notes")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RedemptionRequest[];
    },
    enabled: !!user,
  });

  return { requests, isLoading };
};
