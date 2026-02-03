// Hook to translate document titles based on current language
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n";

// Cache translated titles to avoid repeated API calls
const titleCache = new Map<string, string>();

export const useTranslatedTitle = (originalTitle: string) => {
  const [translatedTitle, setTranslatedTitle] = useState(originalTitle);
  const [loading, setLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

  // Subscribe to language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng);
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const translateTitle = useCallback(async () => {
    // Don't translate if English or no title
    if (currentLanguage === 'en' || !originalTitle) {
      setTranslatedTitle(originalTitle);
      return;
    }

    const cacheKey = `${originalTitle}_${currentLanguage}`;
    
    // Check cache first
    if (titleCache.has(cacheKey)) {
      setTranslatedTitle(titleCache.get(cacheKey)!);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTranslatedTitle(originalTitle);
        return;
      }

      const { data, error } = await supabase.functions.invoke("translate-content", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          content: originalTitle,
          targetLanguage: currentLanguage,
          contentType: "title", // Hint that this is a short title
        },
      });

      if (error) throw error;

      const translated = data?.translatedContent || originalTitle;
      titleCache.set(cacheKey, translated);
      setTranslatedTitle(translated);
    } catch (err) {
      console.error("Title translation error:", err);
      setTranslatedTitle(originalTitle);
    } finally {
      setLoading(false);
    }
  }, [originalTitle, currentLanguage]);

  // Translate when language or title changes
  useEffect(() => {
    translateTitle();
  }, [translateTitle]);

  return { translatedTitle, loading, currentLanguage };
};

// Utility to clear title cache when needed
export const clearTitleCache = () => {
  titleCache.clear();
};
