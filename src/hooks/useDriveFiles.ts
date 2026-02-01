// Hook to fetch files directly from Google Drive folders
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "./useOrganization";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  size?: string;
}

interface UseDriveFilesResult {
  files: DriveFile[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  folderId: string | null;
  folderName: string | null;
}

export function useDriveFiles(folderType: string): UseDriveFilesResult {
  const { user } = useAuth();
  const { org } = useOrganization();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!user?.id || !org?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("drive-list-files", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { folder_type: folderType },
      });

      if (response.error) {
        throw response.error;
      }

      if (response.data?.error) {
        // Handle case where folder doesn't exist yet (not an error, just empty)
        if (response.data.error === "Folder not found") {
          setFiles([]);
          setFolderId(null);
          setFolderName(null);
        } else {
          throw new Error(response.data.error);
        }
      } else {
        setFiles(response.data?.files || []);
        setFolderId(response.data?.folder_id || null);
        setFolderName(response.data?.folder_name || null);
      }
    } catch (err) {
      console.error("Error fetching Drive files:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, org?.id, folderType]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    loading,
    error,
    refresh: fetchFiles,
    folderId,
    folderName,
  };
}
