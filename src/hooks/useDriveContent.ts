// Hook to fetch document content from Google Drive
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DriveContentResult {
  content: string | null;
  loading: boolean;
  error: string | null;
}

// Cache for Drive content to avoid repeated API calls
const contentCache = new Map<string, string>();

export const useDriveContent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDriveContent = useCallback(async (driveFileId: string): Promise<string | null> => {
    // Check cache first
    if (contentCache.has(driveFileId)) {
      return contentCache.get(driveFileId) || null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("drive-export", {
        body: { 
          file_id: driveFileId,
          format: "text" // Get plain text content
        },
      });

      if (fnError) throw fnError;
      
      if (data?.content) {
        contentCache.set(driveFileId, data.content);
        return data.content;
      }
      
      return null;
    } catch (err) {
      console.error("Error fetching Drive content:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch content");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback((driveFileId?: string) => {
    if (driveFileId) {
      contentCache.delete(driveFileId);
    } else {
      contentCache.clear();
    }
  }, []);

  return {
    fetchDriveContent,
    clearCache,
    loading,
    error,
  };
};

// Standalone function for components that need immediate content
export const getDriveContentFromCache = (driveFileId: string): string | null => {
  return contentCache.get(driveFileId) || null;
};
