-- Create orgs table
CREATE TABLE public.orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create org_users table with role check
CREATE TABLE public.org_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'foreman', 'painter', 'office', 'other')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_org_users_org_id ON public.org_users(org_id);
CREATE INDEX idx_org_users_user_id ON public.org_users(user_id);

-- Enable RLS
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_users ENABLE ROW LEVEL SECURITY;

-- Security definer function to check org role
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_users
    WHERE user_id = _user_id
      AND org_id = _org_id
      AND role = _role
      AND is_active = true
  )
$$;

-- Function to check if user is org admin
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_users
    WHERE user_id = _user_id
      AND org_id = _org_id
      AND role = 'admin'
      AND is_active = true
  )
$$;

-- Function to get user's org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id
  FROM public.org_users
  WHERE user_id = _user_id
    AND is_active = true
  LIMIT 1
$$;

-- RLS Policies for orgs
CREATE POLICY "Users can view their org"
ON public.orgs
FOR SELECT
USING (
  id IN (SELECT org_id FROM public.org_users WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Org admins can update their org"
ON public.orgs
FOR UPDATE
USING (public.is_org_admin(auth.uid(), id));

CREATE POLICY "Authenticated users can create orgs"
ON public.orgs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for org_users
CREATE POLICY "Users can view members of their org"
ON public.org_users
FOR SELECT
USING (
  org_id IN (SELECT org_id FROM public.org_users ou WHERE ou.user_id = auth.uid() AND ou.is_active = true)
);

CREATE POLICY "Org admins can insert members"
ON public.org_users
FOR INSERT
WITH CHECK (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can update members"
ON public.org_users
FOR UPDATE
USING (public.is_org_admin(auth.uid(), org_id));

CREATE POLICY "Org admins can delete members"
ON public.org_users
FOR DELETE
USING (public.is_org_admin(auth.uid(), org_id));