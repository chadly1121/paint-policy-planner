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

interface SOPAcknowledgment {
  id: string;
  user_id: string;
  sop_key: string;
  sop_version: number;
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
      // Fetch assignments (all users can view)
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("sop_assignments")
        .select("*");

      if (assignmentError) throw assignmentError;
      setAssignments(assignmentData || []);

      // Fetch user's own acknowledgments
      const { data: ackData, error: ackError } = await supabase
        .from("sop_acknowledgments")
        .select("*")
        .eq("user_id", user.id);

      if (ackError) throw ackError;
      setAcknowledgments(ackData || []);
    } catch (error) {
      console.error("Error fetching SOP assignments:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check if user has acknowledged a specific SOP at current version
  const hasAcknowledged = useCallback((sopKey: string, currentVersion: number = 1) => {
    return acknowledgments.some(
      (ack) => ack.sop_key === sopKey && ack.sop_version >= currentVersion
    );
  }, [acknowledgments]);

  // Get acknowledgment for a specific SOP
  const getAcknowledgment = useCallback((sopKey: string) => {
    return acknowledgments.find((ack) => ack.sop_key === sopKey);
  }, [acknowledgments]);

  // Acknowledge an SOP
  const acknowledgeSOP = async (sopKey: string, sopVersion: number = 1) => {
    if (!user?.id) return { error: new Error("Not authenticated") };

    try {
      const { data, error } = await supabase
        .from("sop_acknowledgments")
        .upsert({
          user_id: user.id,
          sop_key: sopKey,
          sop_version: sopVersion,
          ip_address: null, // Could be captured from API
          user_agent: navigator.userAgent,
        }, {
          onConflict: "user_id,sop_key,sop_version"
        })
        .select()
        .single();

      if (error) throw error;
      
      setAcknowledgments((prev) => {
        const filtered = prev.filter(a => !(a.sop_key === sopKey && a.sop_version === sopVersion));
        return [...filtered, data];
      });
      
      return { data, error: null };
    } catch (error) {
      console.error("Error acknowledging SOP:", error);
      return { data: null, error };
    }
  };

  // Admin: Assign SOP to a role
  const assignSOPToRole = async (sopKey: string, role: "admin" | "employee", requiresAck: boolean = true) => {
    if (!user?.id || !isAdmin) return { error: new Error("Unauthorized") };

    try {
      const { data, error } = await supabase
        .from("sop_assignments")
        .upsert({
          user_id: user.id,
          sop_key: sopKey,
          assigned_role: role,
          requires_acknowledgment: requiresAck,
        }, {
          onConflict: "user_id,sop_key,assigned_role"
        })
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

  // Admin: Remove assignment
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

  // Get assignments for a specific SOP
  const getAssignmentsForSOP = useCallback((sopKey: string) => {
    return assignments.filter((a) => a.sop_key === sopKey);
  }, [assignments]);

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
