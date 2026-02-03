// Hook to fetch document content from Google Drive with translation support
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface DriveContentResult {
  content: string | null;
  loading: boolean;
  error: string | null;
}

// Cache for Drive content to avoid repeated API calls
// Key format: `${driveFileId}_${language}` for translated content
const contentCache = new Map<string, string>();

export const useDriveContent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { i18n } = useTranslation();

  const fetchDriveContent = useCallback(async (
    driveFileId: string, 
    options?: { translate?: boolean }
  ): Promise<string | null> => {
    const shouldTranslate = options?.translate ?? true;
    const targetLanguage = i18n.language || 'en';
    const cacheKey = shouldTranslate ? `${driveFileId}_${targetLanguage}` : driveFileId;

    // Check cache first
    if (contentCache.has(cacheKey)) {
      return contentCache.get(cacheKey) || null;
    }

    setLoading(true);
    setError(null);

    try {
      // First, get the original content
      const { data, error: fnError } = await supabase.functions.invoke("drive-export", {
        body: { 
          file_id: driveFileId,
          format: "text" // Get plain text content
        },
      });

      if (fnError) throw fnError;
      
      if (!data?.content) {
        return null;
      }

      let finalContent = data.content;

      // Translate if needed and not English
      if (shouldTranslate && targetLanguage !== 'en') {
        try {
          const { data: translationData, error: translationError } = await supabase.functions.invoke("translate-content", {
            body: {
              content: data.content,
              targetLanguage,
              sourceLanguage: 'en',
            },
          });

          if (translationError) {
            console.error("Translation error:", translationError);
            // Fall back to original content
          } else if (translationData?.translatedContent) {
            finalContent = translationData.translatedContent;
          }
        } catch (translateErr) {
          console.error("Translation failed, using original:", translateErr);
          // Continue with original content
        }
      }

      contentCache.set(cacheKey, finalContent);
      return finalContent;
    } catch (err) {
      console.error("Error fetching Drive content:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch content");
      return null;
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  const clearCache = useCallback((driveFileId?: string) => {
    if (driveFileId) {
      // Clear all language variants for this file
      for (const key of contentCache.keys()) {
        if (key.startsWith(driveFileId)) {
          contentCache.delete(key);
        }
      }
    } else {
      contentCache.clear();
    }
  }, []);

  return {
    fetchDriveContent,
    clearCache,
    loading,
    error,
    currentLanguage: i18n.language,
  };
};

// Standalone function for components that need immediate content
export const getDriveContentFromCache = (driveFileId: string, language?: string): string | null => {
  const cacheKey = language ? `${driveFileId}_${language}` : driveFileId;
  return contentCache.get(cacheKey) || null;
};
