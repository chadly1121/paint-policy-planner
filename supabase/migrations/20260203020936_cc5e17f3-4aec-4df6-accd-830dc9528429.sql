-- Create redemption_items table for reward catalog
CREATE TABLE public.redemption_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.redemption_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for redemption_items
CREATE POLICY "Users can view their org items"
ON public.redemption_items
FOR SELECT
USING (org_id = get_user_org_id(auth.uid()) AND is_active = true);

CREATE POLICY "Org admins can manage items"
ON public.redemption_items
FOR ALL
USING (is_org_admin(auth.uid(), org_id))
WITH CHECK (is_org_admin(auth.uid(), org_id));

-- Add item_id column to redemption_requests
ALTER TABLE public.redemption_requests
ADD COLUMN item_id UUID REFERENCES public.redemption_items(id);

-- Add item_name to store the name at time of request (for history)
ALTER TABLE public.redemption_requests
ADD COLUMN item_name TEXT;

-- Add org_id to redemption_requests for proper multi-tenant isolation
ALTER TABLE public.redemption_requests
ADD COLUMN org_id UUID REFERENCES public.orgs(id);

-- Create trigger for updated_at
CREATE TRIGGER update_redemption_items_updated_at
BEFORE UPDATE ON public.redemption_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS on redemption_requests for org isolation
DROP POLICY IF EXISTS "Admins can view all requests" ON public.redemption_requests;
DROP POLICY IF EXISTS "Admins can update others requests" ON public.redemption_requests;

CREATE POLICY "Org admins can view org requests"
ON public.redemption_requests
FOR SELECT
USING (
  org_id IS NOT NULL 
  AND is_org_admin(auth.uid(), org_id)
);

CREATE POLICY "Org admins can update org requests"
ON public.redemption_requests
FOR UPDATE
USING (
  org_id IS NOT NULL 
  AND is_org_admin(auth.uid(), org_id) 
  AND user_id != auth.uid()
)
WITH CHECK (
  org_id IS NOT NULL 
  AND is_org_admin(auth.uid(), org_id) 
  AND user_id != auth.uid()
);