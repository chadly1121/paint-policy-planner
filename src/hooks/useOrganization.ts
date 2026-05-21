import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type OrgRole = "admin" | "foreman" | "painter" | "office" | "other";

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  tagline: string | null;
  jurisdiction: string;
  created_at: string;
}

interface OrgUser {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  is_active: boolean;
  created_at: string;
}

interface OrgMember extends OrgUser {
  profile?: {
    full_name: string;
    email: string;
  };
}

export const useOrganization = () => {
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgUser, setOrgUser] = useState<OrgUser | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrganization = useCallback(async () => {
    if (!user?.id) {
      setOrg(null);
      setOrgUser(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      // Get user's org membership
      const { data: orgUserData, error: orgUserError } = await supabase
        .from("org_users")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (orgUserError) throw orgUserError;

      if (!orgUserData) {
        setOrg(null);
        setOrgUser(null);
        setMembers([]);
        setLoading(false);
        return;
      }

      setOrgUser(orgUserData as OrgUser);

      // Get org details
      const { data: orgData, error: orgError } = await supabase
        .from("orgs")
        .select("*")
        .eq("id", orgUserData.org_id)
        .single();

      if (orgError) throw orgError;
      setOrg(orgData);

      // If admin, fetch all members
      if (orgUserData.role === "admin") {
        const { data: membersData, error: membersError } = await supabase
          .from("org_users")
          .select("*")
          .eq("org_id", orgUserData.org_id)
          .eq("is_active", true);

        if (membersError) throw membersError;
        setMembers(membersData as OrgMember[]);
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  const createOrganization = async (name: string): Promise<{ org: Organization | null; error: Error | null }> => {
    if (!user?.id) return { org: null, error: new Error("Not authenticated") };

    try {
      // Create org
      const { data: newOrg, error: orgError } = await supabase
        .from("orgs")
        .insert({ name })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as admin
      const { error: memberError } = await supabase
        .from("org_users")
        .insert({
          org_id: newOrg.id,
          user_id: user.id,
          role: "admin",
        });

      if (memberError) throw memberError;

      await fetchOrganization();
      return { org: newOrg, error: null };
    } catch (error) {
      console.error("Error creating organization:", error);
      return { org: null, error: error as Error };
    }
  };

  const inviteMember = async (
    userId: string,
    role: OrgRole
  ): Promise<{ member: OrgUser | null; error: Error | null }> => {
    if (!org?.id || orgUser?.role !== "admin") {
      return { member: null, error: new Error("Unauthorized") };
    }

    try {
      const { data, error } = await supabase
        .from("org_users")
        .insert({
          org_id: org.id,
          user_id: userId,
          role,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchOrganization();
      return { member: data as OrgUser, error: null };
    } catch (error) {
      console.error("Error inviting member:", error);
      return { member: null, error: error as Error };
    }
  };

  const updateMemberRole = async (
    memberId: string,
    newRole: OrgRole
  ): Promise<{ error: Error | null }> => {
    if (!org?.id || orgUser?.role !== "admin") {
      return { error: new Error("Unauthorized") };
    }

    try {
      const { error } = await supabase
        .from("org_users")
        .update({ role: newRole })
        .eq("id", memberId)
        .eq("org_id", org.id);

      if (error) throw error;

      await fetchOrganization();
      return { error: null };
    } catch (error) {
      console.error("Error updating member role:", error);
      return { error: error as Error };
    }
  };

  const deactivateMember = async (memberId: string): Promise<{ error: Error | null }> => {
    if (!org?.id || orgUser?.role !== "admin") {
      return { error: new Error("Unauthorized") };
    }

    try {
      const { error } = await supabase
        .from("org_users")
        .update({ is_active: false })
        .eq("id", memberId)
        .eq("org_id", org.id);

      if (error) throw error;

      await fetchOrganization();
      return { error: null };
    } catch (error) {
      console.error("Error deactivating member:", error);
      return { error: error as Error };
    }
  };

  return {
    org,
    orgUser,
    members,
    loading,
    isOrgAdmin: orgUser?.role === "admin",
    hasOrg: !!org,
    role: orgUser?.role ?? null,
    createOrganization,
    inviteMember,
    updateMemberRole,
    deactivateMember,
    refresh: fetchOrganization,
  };
};
