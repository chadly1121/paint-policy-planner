import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper logging function for debugging
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Price ID to product mapping
const PRICE_CONFIG = {
  "price_1SwohuI3v1u61BwNPB3vpGgo": { name: "SOPed Pro Monthly", baseUsers: 6 },
  "price_1SwoiAI3v1u61BwNNnVd3fK8": { name: "SOPed Pro Annual", baseUsers: 6 },
  "price_1SwojyI3v1u61BwNuJSCy5WE": { name: "SOPed Pro Friends", baseUsers: 6 },
  "price_1SwoiTI3v1u61BwNkyFkwNYf": { name: "Additional Seat", baseUsers: 0 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's org
    const { data: orgUser, error: orgError } = await supabaseAdmin
      .from("org_users")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (orgError || !orgUser) {
      logStep("User has no org, returning trial status");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        status: "no_org",
        user_limit: 0,
        current_users: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const orgId = orgUser.org_id;
    logStep("Found user org", { orgId });

    // Check existing subscription in our database first
    const { data: existingSub } = await supabaseAdmin
      .from("org_subscriptions")
      .select("*")
      .eq("org_id", orgId)
      .single();

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // If we have a Stripe customer ID, verify subscription status with Stripe
    if (existingSub?.stripe_customer_id) {
      logStep("Checking Stripe for customer", { customerId: existingSub.stripe_customer_id });
      
      const subscriptions = await stripe.subscriptions.list({
        customer: existingSub.stripe_customer_id,
        status: "active",
        limit: 10,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        
        // Calculate base users and extra seats
        let baseUsers = 6;
        let extraSeats = 0;
        
        for (const item of subscription.items.data) {
          const priceId = item.price.id;
          const config = PRICE_CONFIG[priceId as keyof typeof PRICE_CONFIG];
          if (config) {
            if (config.name === "Additional Seat") {
              extraSeats += item.quantity || 0;
            } else {
              baseUsers = config.baseUsers;
            }
          }
        }

        // Update our database with latest from Stripe
        await supabaseAdmin
          .from("org_subscriptions")
          .upsert({
            org_id: orgId,
            stripe_customer_id: existingSub.stripe_customer_id,
            stripe_subscription_id: subscription.id,
            status: "active",
            price_id: subscription.items.data[0]?.price.id,
            product_id: subscription.items.data[0]?.price.product as string,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: periodEnd,
            base_user_limit: baseUsers,
            extra_seats: extraSeats,
            cancel_at_period_end: subscription.cancel_at_period_end,
          }, { onConflict: "org_id" });

        // Get current user count
        const { count: userCount } = await supabaseAdmin
          .from("org_users")
          .select("*", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("is_active", true);

        logStep("Active subscription found", { 
          subscriptionId: subscription.id, 
          periodEnd,
          userLimit: baseUsers + extraSeats,
          currentUsers: userCount
        });

        return new Response(JSON.stringify({
          subscribed: true,
          status: "active",
          subscription_end: periodEnd,
          user_limit: baseUsers + extraSeats,
          current_users: userCount || 0,
          cancel_at_period_end: subscription.cancel_at_period_end,
          price_id: subscription.items.data[0]?.price.id,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        // No active subscription in Stripe, update our database
        await supabaseAdmin
          .from("org_subscriptions")
          .update({ status: "inactive" })
          .eq("org_id", orgId);
      }
    }

    // Check if org admin's email has a Stripe customer (for new subscriptions)
    const { data: orgData } = await supabaseAdmin
      .from("orgs")
      .select("id")
      .eq("id", orgId)
      .single();

    // Get current user count for trial info
    const { count: userCount } = await supabaseAdmin
      .from("org_users")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("is_active", true);

    logStep("No active subscription, returning trial status");
    
    return new Response(JSON.stringify({
      subscribed: false,
      status: "trial",
      user_limit: 6,
      current_users: userCount || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
