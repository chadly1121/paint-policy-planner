import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Price ID to product mapping - LIVE MODE
const PRICE_CONFIG: Record<string, { name: string; baseUsers: number }> = {
  "price_1SwohuI3v1u61BwNPB3vpGgo": { name: "SOPed Pro Monthly", baseUsers: 6 },
  "price_1SwoiAI3v1u61BwNNnVd3fK8": { name: "SOPed Pro Annual", baseUsers: 6 },
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
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No stripe-signature header");
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err instanceof Error ? err.message : String(err) });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabaseAdmin, stripe, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabaseAdmin, subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabaseAdmin, invoice);
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleSubscriptionChange(
  supabase: any,
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  logStep("Processing subscription change", { 
    subscriptionId: subscription.id, 
    status: subscription.status,
    customerId: subscription.customer 
  });

  // Get customer email
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if (customer.deleted) {
    logStep("Customer was deleted, skipping");
    return;
  }

  const email = customer.email;
  if (!email) {
    logStep("No email on customer, skipping");
    return;
  }

  // Find user by email
  const { data: userData } = await supabase.auth.admin.listUsers();
  const user = userData?.users?.find((u: any) => u.email === email);
  
  if (!user) {
    logStep("No user found for email", { email });
    return;
  }

  // Get user's org
  const { data: orgUser } = await supabase
    .from("org_users")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!orgUser) {
    logStep("User has no org", { userId: user.id });
    return;
  }

  // Calculate base users and extra seats
  let baseUsers = 6;
  let extraSeats = 0;
  
  for (const item of subscription.items.data) {
    const priceId = item.price.id;
    const config = PRICE_CONFIG[priceId];
    if (config) {
      if (config.name === "Additional Seat") {
        extraSeats += item.quantity || 0;
      } else {
        baseUsers = config.baseUsers;
      }
    }
  }

  const status = subscription.status === "active" || subscription.status === "trialing" 
    ? "active" 
    : "inactive";

  // Safely convert timestamps - Stripe uses Unix timestamps (seconds)
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  
  if (subscription.current_period_start && typeof subscription.current_period_start === 'number') {
    periodStart = new Date(subscription.current_period_start * 1000).toISOString();
  }
  if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
    periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  }

  logStep("Preparing subscription upsert", { periodStart, periodEnd, status, baseUsers, extraSeats });

  // Upsert subscription record
  const { error } = await supabase
    .from("org_subscriptions")
    .upsert({
      org_id: orgUser.org_id,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      status,
      price_id: subscription.items.data[0]?.price.id,
      product_id: subscription.items.data[0]?.price.product as string,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      base_user_limit: baseUsers,
      extra_seats: extraSeats,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }, { onConflict: "org_id" });

  if (error) {
    logStep("Error upserting subscription", { error: error.message });
    throw error;
  }

  logStep("Subscription synced", { 
    orgId: orgUser.org_id, 
    status,
    userLimit: baseUsers + extraSeats 
  });
}

async function handleSubscriptionDeleted(
  supabase: any,
  subscription: Stripe.Subscription
) {
  logStep("Processing subscription deletion", { subscriptionId: subscription.id });

  // Find subscription by stripe_subscription_id
  const { data: existingSub } = await supabase
    .from("org_subscriptions")
    .select("org_id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (!existingSub) {
    logStep("No subscription found to delete");
    return;
  }

  // Mark as inactive
  const { error } = await supabase
    .from("org_subscriptions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    logStep("Error updating subscription", { error: error.message });
    throw error;
  }

  logStep("Subscription marked as cancelled", { orgId: existingSub.org_id });
}

async function handlePaymentFailed(
  supabase: any,
  invoice: Stripe.Invoice
) {
  logStep("Processing payment failure", { 
    invoiceId: invoice.id,
    customerId: invoice.customer,
    subscriptionId: invoice.subscription 
  });

  if (!invoice.subscription) {
    logStep("No subscription on invoice, skipping");
    return;
  }

  // Find subscription
  const { data: existingSub } = await supabase
    .from("org_subscriptions")
    .select("org_id")
    .eq("stripe_subscription_id", invoice.subscription as string)
    .single();

  if (!existingSub) {
    logStep("No subscription found for payment failure");
    return;
  }

  // Update status to past_due
  const { error } = await supabase
    .from("org_subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", invoice.subscription as string);

  if (error) {
    logStep("Error updating subscription status", { error: error.message });
    throw error;
  }

  logStep("Subscription marked as past_due", { orgId: existingSub.org_id });
}
