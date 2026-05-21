import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SOPAssignment {
  id: string;
  user_id: string;
  sop_key: string;
  assigned_role: "admin" | "employee";
  requires_acknowledgment: boolean;
  created_at: string;
  updated_at: string;
}

// Backed by the canonical `sop_acks` table. We keep `sop_key` in the external
// shape (resolved from sops.system_key) so existing callers don't need to change.
interface SOPAcknowledgment {
  id: string;
  user_id: string;
  sop_key: string;
  sop_id: string;
  ack_epoch: number;
  quiz_score: number | null;
  acknowledged_at: string;
}

export const useSOPAssignments = () => {
  const { user, isAdmin } = useAuth();
  const [assignments, setAssignments] = useState<SOPAssignment[]>([]);
  const [acknowledgments, setAcknowledgments] = useState<SOPAcknowledgment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setAssignments([]);
      setAcknowledgments([]);
      setLoading(false);
      return;
    }

    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("sop_assignments")
        .select("*");

      if (assignmentError) throw assignmentError;
      setAssignments(assignmentData || []);

      // Read canonical sop_acks joined with sops to expose sop_key (system_key) to callers.
      const { data: ackData, error: ackError } = await supabase
        .from("sop_acks")
        .select("id, user_id, sop_id, ack_epoch, quiz_score, acknowledged_at, sops!inner(system_key)")
        .eq("user_id", user.id);

      if (ackError) throw ackError;
      setAcknowledgments(
        (ackData || [])
          .filter((row: any) => row.sops?.system_key)
          .map((row: any) => ({
            id: row.id,
            user_id: row.user_id,
            sop_id: row.sop_id,
            sop_key: row.sops.system_key,
            ack_epoch: row.ack_epoch,
            quiz_score: row.quiz_score,
            acknowledged_at: row.acknowledged_at,
          })),
      );
    } catch (error) {
      console.error("Error fetching SOP assignments:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Considered acknowledged if there's an ack for the current ack_epoch (>= requested version).
  const hasAcknowledged = useCallback(
    (sopKey: string, currentVersion: number = 1) =>
      acknowledgments.some((a) => a.sop_key === sopKey && a.ack_epoch >= currentVersion),
    [acknowledgments],
  );

  const getAcknowledgment = useCallback(
    (sopKey: string) => acknowledgments.find((a) => a.sop_key === sopKey),
    [acknowledgments],
  );

  // Acknowledge an SOP. Resolves sopKey -> sop_id via sops.system_key, then writes
  // to sop_acks with the current ack_epoch and a snapshot of the latest passing quiz score.
  const acknowledgeSOP = async (sopKey: string, _sopVersion: number = 1) => {
    if (!user?.id) return { data: null, error: new Error("Not authenticated") };

    try {
      const { data: sop, error: sopError } = await supabase
        .from("sops")
        .select("id, ack_epoch, version, org_id")
        .eq("system_key", sopKey)
        .maybeSingle();

      if (sopError) throw sopError;
      if (!sop) throw new Error(`No SOP found for key ${sopKey}`);

      // Snapshot the user's most recent passing quiz score for this section, if any.
      const { data: quiz } = await supabase
        .from("quiz_attempts")
        .select("score")
        .eq("user_id", user.id)
        .eq("section_key", sopKey)
        .eq("passed", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Resolve org_id: prefer SOP's org_id (org-owned), else the user's active org (system SOP).
      let resolvedOrgId: string | null = (sop as any).org_id ?? null;
      if (!resolvedOrgId) {
        const { data: ou } = await supabase
          .from("org_users")
          .select("org_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();
        resolvedOrgId = ou?.org_id ?? null;
      }

      const { data, error } = await supabase
        .from("sop_acks")
        .insert({
          user_id: user.id,
          sop_id: sop.id,
          ack_epoch: sop.ack_epoch,
          document_version: (sop as any).version ?? sop.ack_epoch,
          org_id: resolvedOrgId,
          quiz_score: quiz?.score ?? null,
          user_agent: navigator.userAgent,
        })
        .select("id, user_id, sop_id, ack_epoch, quiz_score, acknowledged_at")
        .single();


      if (error) throw error;

      setAcknowledgments((prev) => [
        ...prev.filter((a) => !(a.sop_key === sopKey && a.ack_epoch === sop.ack_epoch)),
        { ...data, sop_key: sopKey } as SOPAcknowledgment,
      ]);

      return { data, error: null };
    } catch (error) {
      console.error("Error acknowledging SOP:", error);
      return { data: null, error };
    }
  };

  const assignSOPToRole = async (
    sopKey: string,
    role: "admin" | "employee",
    requiresAck: boolean = true,
  ) => {
    if (!user?.id || !isAdmin) return { data: null, error: new Error("Unauthorized") };

    try {
      const { data, error } = await supabase
        .from("sop_assignments")
        .upsert(
          {
            user_id: user.id,
            sop_key: sopKey,
            assigned_role: role,
            requires_acknowledgment: requiresAck,
          },
          { onConflict: "user_id,sop_key,assigned_role" },
        )
        .select()
        .single();

      if (error) throw error;
      await fetchData();
      return { data, error: null };
    } catch (error) {
      console.error("Error assigning SOP:", error);
      return { data: null, error };
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    if (!user?.id || !isAdmin) return { error: new Error("Unauthorized") };

    try {
      const { error } = await supabase
        .from("sop_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      return { error: null };
    } catch (error) {
      console.error("Error removing assignment:", error);
      return { error };
    }
  };

  const getAssignmentsForSOP = useCallback(
    (sopKey: string) => assignments.filter((a) => a.sop_key === sopKey),
    [assignments],
  );

  return {
    assignments,
    acknowledgments,
    loading,
    hasAcknowledged,
    getAcknowledgment,
    acknowledgeSOP,
    assignSOPToRole,
    removeAssignment,
    getAssignmentsForSOP,
    refreshData: fetchData,
  };
};
