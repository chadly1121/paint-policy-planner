import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";

export interface RedemptionItem {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  points_required: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useRedemptionItems = () => {
  const { user } = useAuth();
  const { org } = useOrganization();
  const [items, setItems] = useState<RedemptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!org?.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("redemption_items")
        .select("*")
        .eq("org_id", org.id)
        .order("points_required", { ascending: true });

      if (error) throw error;
      setItems((data as RedemptionItem[]) || []);
    } catch (error) {
      console.error("Error fetching redemption items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [org?.id]);

  useEffect(() => {
    if (user && org?.id) {
      fetchItems();
    }
  }, [user, org?.id, fetchItems]);

  const createItem = async (item: Omit<RedemptionItem, "id" | "org_id" | "created_at" | "updated_at">) => {
    if (!org?.id || !user?.id) {
      return { error: new Error("No organization found") };
    }

    try {
      const { data, error } = await supabase
        .from("redemption_items")
        .insert({
          ...item,
          org_id: org.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchItems();
      return { data: data as RedemptionItem, error: null };
    } catch (error) {
      console.error("Error creating redemption item:", error);
      return { data: null, error };
    }
  };

  const updateItem = async (id: string, updates: Partial<Omit<RedemptionItem, "id" | "org_id" | "created_at" | "updated_at">>) => {
    try {
      const { data, error } = await supabase
        .from("redemption_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      await fetchItems();
      return { data: data as RedemptionItem, error: null };
    } catch (error) {
      console.error("Error updating redemption item:", error);
      return { data: null, error };
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("redemption_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchItems();
      return { error: null };
    } catch (error) {
      console.error("Error deleting redemption item:", error);
      return { error };
    }
  };

  return {
    items,
    loading,
    refresh: fetchItems,
    createItem,
    updateItem,
    deleteItem,
  };
};
