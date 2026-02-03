import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrganizationContext";

export interface SubscriptionStatus {
  subscribed: boolean;
  status: "active" | "trial" | "inactive" | "pending" | "no_org";
  subscription_end?: string;
  user_limit: number;
  current_users: number;
  cancel_at_period_end?: boolean;
  price_id?: string;
}

export function useSubscription() {
  const { user, session } = useAuth();
  const { org, isOrgAdmin } = useOrg();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!user || !session) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke("check-subscription");
      
      if (fnError) {
        console.error("Error checking subscription:", fnError);
        setError(fnError.message);
        // Default to trial on error
        setSubscription({
          subscribed: false,
          status: "trial",
          user_limit: 6,
          current_users: 0,
        });
      } else {
        setSubscription(data as SubscriptionStatus);
      }
    } catch (err) {
      console.error("Error checking subscription:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setSubscription({
        subscribed: false,
        status: "trial",
        user_limit: 6,
        current_users: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [user, session]);

  // Check subscription on mount and when user changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Refresh subscription periodically (every 60 seconds)
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const createCheckout = async (plan: "monthly" | "annual" | "friends" = "monthly", extraSeats = 0) => {
    if (!isOrgAdmin) {
      throw new Error("Only organization admins can subscribe");
    }

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { plan, extra_seats: extraSeats },
    });

    if (error) throw new Error(error.message);
    if (data?.url) {
      window.open(data.url, "_blank");
    }
    return data;
  };

  const openCustomerPortal = async () => {
    if (!isOrgAdmin) {
      throw new Error("Only organization admins can manage subscriptions");
    }

    const { data, error } = await supabase.functions.invoke("customer-portal");

    if (error) throw new Error(error.message);
    if (data?.url) {
      window.open(data.url, "_blank");
    }
    return data;
  };

  const canAddUsers = (count = 1): boolean => {
    if (!subscription) return false;
    return subscription.current_users + count <= subscription.user_limit;
  };

  const remainingSeats = subscription 
    ? subscription.user_limit - subscription.current_users 
    : 0;

  return {
    subscription,
    loading,
    error,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    canAddUsers,
    remainingSeats,
    isSubscribed: subscription?.subscribed ?? false,
    isTrial: subscription?.status === "trial",
    isActive: subscription?.status === "active",
  };
}
