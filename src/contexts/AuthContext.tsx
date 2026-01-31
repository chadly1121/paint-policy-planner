import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, companyName: string, preferredLanguage?: string, country?: string) => Promise<{ error: Error | null; data?: { user: User | null } }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkAdminStatus(session.user.id);
            loadUserLanguagePreference(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
        loadUserLanguagePreference(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    
    if (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
      return;
    }
    
    setIsAdmin(!!data);
  };

  const loadUserLanguagePreference = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("preferred_language")
      .eq("user_id", userId)
      .single();
    
    if (data?.preferred_language) {
      i18n.changeLanguage(data.preferred_language);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, companyName: string, preferredLanguage: string = "en", country?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { 
          full_name: companyName,
          company_name: companyName,
          preferred_language: preferredLanguage,
          country: country || null,
        },
      },
    });
    return { error: error as Error | null, data: { user: data.user } };
  };

  const signOut = async () => {
    // Clear local state immediately regardless of server response
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    
    // Try to sign out on server, but don't fail if session already invalid
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.log('Sign out completed (session may have already expired)');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
