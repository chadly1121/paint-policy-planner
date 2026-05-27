import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrganizationContext";

interface Certificate {
  id: string;
  name: string;
  issuing_authority: string | null;
  certificate_url: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  created_at: string;
}

interface Award {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  awarded_date: string | null;
  created_at: string;
}

interface EmployeeProfile {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  preferred_language: string;
  company_name: string | null;
}

export const useEmployeeProfile = (targetUserId?: string) => {
  const { user } = useAuth();
  const { org } = useOrg();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiringCertificates, setExpiringCertificates] = useState<Certificate[]>([]);

  const userId = targetUserId || user?.id;

  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url, bio, preferred_language, company_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch certificates
      const { data: certsData } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", userId)
        .order("expiry_date", { ascending: true });

      if (certsData) {
        setCertificates(certsData);
        
        // Find certificates expiring within the next month
        const now = new Date();
        const oneMonthFromNow = new Date();
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
        
        const expiring = certsData.filter((cert) => {
          if (!cert.expiry_date) return false;
          const expiryDate = new Date(cert.expiry_date);
          return expiryDate >= now && expiryDate <= oneMonthFromNow;
        });
        setExpiringCertificates(expiring);
      }

      // Fetch awards
      const { data: awardsData } = await supabase
        .from("awards")
        .select("*")
        .eq("user_id", userId)
        .order("awarded_date", { ascending: false });

      if (awardsData) {
        setAwards(awardsData);
      }
    } catch (error) {
      console.error("Error fetching employee profile:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<EmployeeProfile>) => {
    if (!user?.id) return { error: new Error("Not authenticated") };

    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
      await fetchProfile();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const addCertificate = async (certificate: {
    name: string;
    cert_type?: string;
    issuing_authority?: string;
    certificate_url?: string;
    issue_date?: string;
    expiry_date?: string;
  }) => {
    if (!user?.id) return { error: new Error("Not authenticated") };

    try {
      const { error } = await supabase
        .from("certificates")
        .insert({
          user_id: user.id,
          org_id: org?.id,
          ...certificate,
        } as any);

      if (error) throw error;
      await fetchProfile();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateCertificate = async (id: string, updates: Partial<Certificate>) => {
    if (!user?.id) return { error: new Error("Not authenticated") };

    try {
      const { error } = await supabase
        .from("certificates")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      await fetchProfile();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const deleteCertificate = async (id: string) => {
    if (!user?.id) return { error: new Error("Not authenticated") };

    try {
      const { error } = await supabase
        .from("certificates")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      await fetchProfile();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const addAward = async (award: {
    title: string;
    description?: string;
    image_url?: string;
    awarded_date?: string;
  }) => {
    if (!user?.id) return { error: new Error("Not authenticated") };

    try {
      const { error } = await supabase
        .from("awards")
        .insert({
          user_id: user.id,
          org_id: org?.id,
          ...award,
        });

      if (error) throw error;
      await fetchProfile();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const deleteAward = async (id: string) => {
    if (!user?.id) return { error: new Error("Not authenticated") };

    try {
      const { error } = await supabase
        .from("awards")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      await fetchProfile();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const uploadFile = async (file: File, folder: "avatars" | "certificates" | "awards") => {
    if (!user?.id) return { url: null, error: new Error("Not authenticated") };

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("employee-files")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("employee-files")
        .getPublicUrl(fileName);

      return { url: data.publicUrl, error: null };
    } catch (error) {
      return { url: null, error: error as Error };
    }
  };

  return {
    profile,
    certificates,
    awards,
    loading,
    expiringCertificates,
    isOwnProfile: userId === user?.id,
    updateProfile,
    addCertificate,
    updateCertificate,
    deleteCertificate,
    addAward,
    deleteAward,
    uploadFile,
    refresh: fetchProfile,
  };
};
