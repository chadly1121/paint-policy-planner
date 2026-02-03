-- Create org_subscriptions table to track Stripe subscriptions
CREATE TABLE public.org_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'inactive',
  price_id text,
  product_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  base_user_limit integer NOT NULL DEFAULT 6,
  extra_seats integer NOT NULL DEFAULT 0,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(org_id),
  UNIQUE(stripe_subscription_id)
);

-- Enable RLS
ALTER TABLE public.org_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org admins can view their subscription"
  ON public.org_subscriptions
  FOR SELECT
  USING (is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org members can view subscription status"
  ON public.org_subscriptions
  FOR SELECT
  USING (org_id = get_user_org_id(auth.uid()));

-- Create function to get org's current user count
CREATE OR REPLACE FUNCTION public.get_org_user_count(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.org_users
  WHERE org_id = _org_id
    AND is_active = true
$$;

-- Create function to check if org can add more users
CREATE OR REPLACE FUNCTION public.org_can_add_users(_org_id uuid, _count integer DEFAULT 1)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (s.base_user_limit + s.extra_seats) >= (get_org_user_count(_org_id) + _count)
      FROM public.org_subscriptions s
      WHERE s.org_id = _org_id
        AND s.status = 'active'
    ),
    -- No subscription = trial mode, allow up to 6 users
    get_org_user_count(_org_id) + _count <= 6
  )
$$;

-- Create function to get subscription info for an org
CREATE OR REPLACE FUNCTION public.get_org_subscription(_org_id uuid)
RETURNS TABLE(
  status text,
  user_limit integer,
  current_users integer,
  period_end timestamp with time zone,
  cancel_at_period_end boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(s.status, 'trial') as status,
    COALESCE(s.base_user_limit + s.extra_seats, 6) as user_limit,
    get_org_user_count(_org_id) as current_users,
    s.current_period_end as period_end,
    COALESCE(s.cancel_at_period_end, false) as cancel_at_period_end
  FROM public.orgs o
  LEFT JOIN public.org_subscriptions s ON s.org_id = o.id
  WHERE o.id = _org_id
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_org_subscriptions_updated_at
  BEFORE UPDATE ON public.org_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();