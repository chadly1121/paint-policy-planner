import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Available prices - TEST MODE
const PRICES = {
  monthly: "price_1SwpJjI3v1u61BwN1d5apgRH",    // $79/mo
  annual: "price_1SwpK2I3v1u61BwN0aJBYr5w",     // $790/yr
  extra_seat: "price_1SwpKVI3v1u61BwN3OLDf42N", // $8/mo per seat
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's org and verify they're an admin
    const { data: orgUser, error: orgError } = await supabaseAdmin
      .from("org_users")
      .select("org_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (orgError || !orgUser) {
      throw new Error("User must belong to an organization to subscribe");
    }

    if (orgUser.role !== "admin") {
      throw new Error("Only organization admins can manage subscriptions");
    }

    const orgId = orgUser.org_id;
    logStep("User is org admin", { orgId });

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const planType = body.plan || "monthly"; // monthly, annual, or friends
    const extraSeats = body.extra_seats || 0;
    
    logStep("Checkout request", { planType, extraSeats });

    // Get the price ID based on plan type
    let priceId: string;
    if (planType === "annual") {
      priceId = PRICES.annual;
    } else {
      priceId = PRICES.monthly;
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });

      // Check if already has active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        throw new Error("Organization already has an active subscription. Use the customer portal to manage it.");
      }
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 },
    ];

    // Add extra seats if requested
    if (extraSeats > 0) {
      lineItems.push({
        price: PRICES.extra_seat,
        quantity: extraSeats,
      });
    }

    const origin = req.headers.get("origin") || "https://soped.ai";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${origin}/admin?subscription=success`,
      cancel_url: `${origin}/admin?subscription=cancelled`,
      metadata: {
        org_id: orgId,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          org_id: orgId,
          user_id: user.id,
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Store/update the org_subscriptions record with pending status
    await supabaseAdmin
      .from("org_subscriptions")
      .upsert({
        org_id: orgId,
        stripe_customer_id: customerId || null,
        status: "pending",
      }, { onConflict: "org_id" });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
