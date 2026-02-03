import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useToast } from "@/hooks/use-toast";

interface DriveFileMetadata {
  id: string;
  org_id: string;
  drive_file_id: string;
  video_url: string | null;
}

export function useDriveFileMetadata(driveFileId: string) {
  const { org } = useOrganization();
  const { toast } = useToast();
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

  // Update video URL in both the database and the Google Doc
  const updateVideoUrl = async (videoUrl: string | null) => {
    if (!orgId || !driveFileId) return false;

    try {
      // First, update the Google Doc to include/remove the video link
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const driveResponse = await supabase.functions.invoke("drive-update-video-link", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { file_id: driveFileId, video_url: videoUrl },
      });

      if (driveResponse.error) {
        console.error("Failed to update Drive document:", driveResponse.error);
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Video saved to database but couldn't update the Drive document.",
        });
      }

      // Then update the database metadata
      if (metadata) {
        const { error } = await supabase
          .from("drive_file_metadata")
          .update({ video_url: videoUrl })
          .eq("id", metadata.id);

        if (error) throw error;
      } else {
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
