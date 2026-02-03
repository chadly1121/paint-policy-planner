import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

interface DriveFileMetadata {
  id: string;
  org_id: string;
  drive_file_id: string;
  video_url: string | null;
}

export function useDriveFileMetadata(driveFileId: string) {
  const { org } = useOrganization();
  const [metadata, setMetadata] = useState<DriveFileMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  const orgId = org?.id;

  const fetchMetadata = useCallback(async () => {
    if (!orgId || !driveFileId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("drive_file_metadata")
        .select("*")
        .eq("org_id", orgId)
        .eq("drive_file_id", driveFileId)
        .maybeSingle();

      if (error) throw error;
      setMetadata(data);
    } catch (err) {
      console.error("Error fetching drive file metadata:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, driveFileId]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  const updateVideoUrl = async (videoUrl: string | null) => {
    if (!orgId || !driveFileId) return false;

    try {
      if (metadata) {
        // Update existing record
        const { error } = await supabase
          .from("drive_file_metadata")
          .update({ video_url: videoUrl })
          .eq("id", metadata.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("drive_file_metadata")
          .insert({
            org_id: orgId,
            drive_file_id: driveFileId,
            video_url: videoUrl,
          });

        if (error) throw error;
      }

      await fetchMetadata();
      return true;
    } catch (err) {
      console.error("Error updating video URL:", err);
      return false;
    }
  };

  return {
    videoUrl: metadata?.video_url ?? null,
    loading,
    updateVideoUrl,
    refresh: fetchMetadata,
  };
}
