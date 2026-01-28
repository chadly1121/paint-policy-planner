// Hook for managing organization SOPs with role assignments
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "./useOrganization";

interface SOP {
  id: string;
  org_id: string | null;
  source: "system" | "org";
  system_key: string | null;
  title: string;
  status: string;
  content_md: string;
  version: number;
  ack_epoch: number;
  ack_required: boolean;
  ack_reset_on_change: boolean;
  created_at: string;
  updated_at: string;
  last_change_summary: string | null;
  forked_from_sop_id: string | null;
}

interface SOPAck {
  id: string;
  sop_id: string;
  user_id: string;
  ack_epoch: number;
  acknowledged_at: string;
}

interface AssignedSOP {
  sop_id: string;
  title: string;
  content_md: string;
  version: number;
  ack_epoch: number;
  ack_required: boolean;
  is_acknowledged: boolean;
  source: string;
  system_key: string | null;
}

interface HiddenSOP {
  id: string;
  org_id: string;
  system_key: string;
  hidden_at: string;
}

export const useOrgSops = () => {
  const { user } = useAuth();
  const { org, orgUser } = useOrganization();
  const [sops, setSops] = useState<SOP[]>([]);
  const [acks, setAcks] = useState<SOPAck[]>([]);
  const [assignedSops, setAssignedSops] = useState<AssignedSOP[]>([]);
  const [hiddenSops, setHiddenSops] = useState<HiddenSOP[]>([]);
  const [loading, setLoading] = useState(true);

  const assignSopToAllRoles = useCallback(
    async (sopId: string, orgId: string) => {
      // Newly created org SOPs must be assigned to a role to appear in the SOPs page.
      // We default to "all" so the SOP is visible to everyone in the org unless the admin
      // later changes assignments.
      const { error } = await supabase.from("sop_role_assignments").insert({
        org_id: orgId,
        sop_id: sopId,
        role: "all",
        is_required: true,
        created_by: orgUser?.id ?? null,
      });

      // If there's a unique constraint in the DB, repeated inserts may throw 23505.
      // Treat that as success.
      if (error) {
        const code = (error as unknown as { code?: string })?.code;
        if (code !== "23505") throw error;
      }
    },
    [orgUser?.id]
  );

  const fetchSops = useCallback(async () => {
    if (!user?.id) {
      setSops([]);
      setAcks([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch all accessible SOPs (system + org if user has org)
      const query = supabase
        .from("sops")
        .select("*")
        .eq("status", "active");

      const { data: sopsData, error: sopsError } = await query;
      if (sopsError) throw sopsError;
      setSops((sopsData || []) as SOP[]);

      // Fetch user's acknowledgments
      const { data: acksData, error: acksError } = await supabase
        .from("sop_acks")
        .select("*")
        .eq("user_id", user.id);

      if (acksError) throw acksError;
      setAcks((acksData || []) as SOPAck[]);

      // Fetch assigned SOPs via RPC function
      const { data: assignedData, error: assignedError } = await supabase
        .rpc("get_user_assigned_sops", { _user_id: user.id });

      if (assignedError) {
        console.error("Error fetching assigned SOPs:", assignedError);
      } else {
        setAssignedSops((assignedData || []) as AssignedSOP[]);
      }

      // Fetch hidden SOPs for the org
      if (org?.id) {
        const { data: hiddenData, error: hiddenError } = await supabase
          .from("org_hidden_sops")
          .select("*")
          .eq("org_id", org.id);

        if (hiddenError) {
          console.error("Error fetching hidden SOPs:", hiddenError);
        } else {
          setHiddenSops((hiddenData || []) as HiddenSOP[]);
        }
      }
    } catch (error) {
      console.error("Error fetching SOPs:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSops();
  }, [fetchSops]);

  const hasAcknowledged = useCallback(
    (sopId: string): boolean => {
      const sop = sops.find((s) => s.id === sopId);
      if (!sop) return false;

      return acks.some(
        (a) => a.sop_id === sopId && a.ack_epoch === sop.ack_epoch
      );
    },
    [sops, acks]
  );

  const acknowledgeSop = async (
    sopId: string
  ): Promise<{ error: Error | null }> => {
    if (!user?.id) return { error: new Error("Not authenticated") };

    const sop = sops.find((s) => s.id === sopId);
    if (!sop) return { error: new Error("SOP not found") };

    try {
      const { error } = await supabase.from("sop_acks").insert({
        sop_id: sopId,
        user_id: user.id,
        ack_epoch: sop.ack_epoch,
        org_user_id: orgUser?.id || null,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;

      await fetchSops();
      return { error: null };
    } catch (error) {
      console.error("Error acknowledging SOP:", error);
      return { error: error as Error };
    }
  };

  const forkSystemSop = async (
    systemKey: string,
    customTitle?: string,
    customContent?: string
  ): Promise<{ sop: SOP | null; error: Error | null }> => {
    if (!user?.id || !org?.id || !orgUser?.id) {
      return { sop: null, error: new Error("Not authenticated or no org") };
    }

    const systemSop = sops.find(
      (s) => s.source === "system" && s.system_key === systemKey
    );
    if (!systemSop) return { sop: null, error: new Error("System SOP not found") };

    try {
      const { data, error } = await supabase
        .from("sops")
        .insert({
          org_id: org.id,
          source: "org",
          title: customTitle || systemSop.title,
          content_md: customContent || systemSop.content_md,
          forked_from_sop_id: systemSop.id,
          created_by: orgUser.id,
          updated_by: orgUser.id,
        })
        .select()
        .single();

      if (error) throw error;

      await assignSopToAllRoles((data as SOP).id, org.id);

      await fetchSops();
      return { sop: data as SOP, error: null };
    } catch (error) {
      console.error("Error forking SOP:", error);
      return { sop: null, error: error as Error };
    }
  };

  const createOrgSop = async (
    title: string,
    content: string
  ): Promise<{ sop: SOP | null; error: Error | null }> => {
    if (!user?.id || !org?.id || !orgUser?.id) {
      return { sop: null, error: new Error("Not authenticated or no org") };
    }

    try {
      const { data, error } = await supabase
        .from("sops")
        .insert({
          org_id: org.id,
          source: "org",
          title,
          content_md: content,
          created_by: orgUser.id,
          updated_by: orgUser.id,
        })
        .select()
        .single();

      if (error) throw error;

      await assignSopToAllRoles((data as SOP).id, org.id);

      await fetchSops();
      return { sop: data as SOP, error: null };
    } catch (error) {
      console.error("Error creating SOP:", error);
      return { sop: null, error: error as Error };
    }
  };

  const updateSop = async (
    sopId: string,
    updates: { title?: string; content_md?: string; last_change_summary?: string }
  ): Promise<{ error: Error | null }> => {
    if (!user?.id || !orgUser?.id) {
      return { error: new Error("Not authenticated") };
    }

    try {
      const { error } = await supabase
        .from("sops")
        .update({
          ...updates,
          updated_by: orgUser.id,
        })
        .eq("id", sopId);

      if (error) throw error;

      await fetchSops();
      return { error: null };
    } catch (error) {
      console.error("Error updating SOP:", error);
      return { error: error as Error };
    }
  };

  const archiveSop = async (sopId: string): Promise<{ error: Error | null }> => {
    if (!user?.id || !orgUser?.id) {
      return { error: new Error("Not authenticated") };
    }

    try {
      const { error } = await supabase
        .from("sops")
        .update({ status: "archived", updated_by: orgUser.id })
        .eq("id", sopId);

      if (error) throw error;

      await fetchSops();
      return { error: null };
    } catch (error) {
      console.error("Error archiving SOP:", error);
      return { error: error as Error };
    }
  };

  const deleteSop = async (sopId: string): Promise<{ error: Error | null }> => {
    if (!user?.id || !orgUser?.id) {
      return { error: new Error("Not authenticated") };
    }

    try {
      // First delete role assignments
      await supabase
        .from("sop_role_assignments")
        .delete()
        .eq("sop_id", sopId);

      // Then delete acknowledgments
      await supabase
        .from("sop_acks")
        .delete()
        .eq("sop_id", sopId);

      // Finally delete the SOP
      const { error } = await supabase
        .from("sops")
        .delete()
        .eq("id", sopId);

      if (error) throw error;

      await fetchSops();
      return { error: null };
    } catch (error) {
      console.error("Error deleting SOP:", error);
      return { error: error as Error };
    }
  };

  const hideSystemSop = async (
    systemKey: string
  ): Promise<{ error: Error | null }> => {
    if (!user?.id || !org?.id || !orgUser?.id) {
      return { error: new Error("Not authenticated or no org") };
    }

    try {
      const { error } = await supabase.from("org_hidden_sops").insert({
        org_id: org.id,
        system_key: systemKey,
        hidden_by: orgUser.id,
      });

      if (error) throw error;

      await fetchSops();
      return { error: null };
    } catch (error) {
      console.error("Error hiding SOP:", error);
      return { error: error as Error };
    }
  };

  const unhideSystemSop = async (
    systemKey: string
  ): Promise<{ error: Error | null }> => {
    if (!user?.id || !org?.id) {
      return { error: new Error("Not authenticated or no org") };
    }

    try {
      const { error } = await supabase
        .from("org_hidden_sops")
        .delete()
        .eq("org_id", org.id)
        .eq("system_key", systemKey);

      if (error) throw error;

      await fetchSops();
      return { error: null };
    } catch (error) {
      console.error("Error unhiding SOP:", error);
      return { error: error as Error };
    }
  };

  const isSystemSopHidden = useCallback(
    (systemKey: string | null): boolean => {
      if (!systemKey) return false;
      return hiddenSops.some((h) => h.system_key === systemKey);
    },
    [hiddenSops]
  );

  // Filter helpers
  const systemSops = sops.filter((s) => s.source === "system");
  const orgSops = sops.filter((s) => s.source === "org" && s.org_id === org?.id);
  const pendingAcks = assignedSops.filter(
    (s) => s.ack_required && !s.is_acknowledged
  );

  return {
    sops,
    systemSops,
    orgSops,
    acks,
    assignedSops,
    hiddenSops,
    pendingAcks,
    loading,
    hasAcknowledged,
    acknowledgeSop,
    forkSystemSop,
    createOrgSop,
    updateSop,
    archiveSop,
    deleteSop,
    hideSystemSop,
    unhideSystemSop,
    isSystemSopHidden,
    refresh: fetchSops,
  };
};
