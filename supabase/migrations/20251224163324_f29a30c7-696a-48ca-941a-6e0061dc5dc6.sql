-- Create sops table
CREATE TABLE public.sops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- null org_id means "system SOP"
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('system', 'org')),
  system_key text, -- e.g. 'SOP-008' for system rows
  
  title text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  
  -- content format: markdown or JSON
  content_md text NOT NULL,
  
  -- ownership/metadata
  created_by uuid REFERENCES public.org_users(id),
  updated_by uuid REFERENCES public.org_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- basic versioning
  version int NOT NULL DEFAULT 1,
  ack_epoch int NOT NULL DEFAULT 1, -- key for re-ack
  
  last_change_summary text,
  
  ack_required boolean NOT NULL DEFAULT true,
  ack_reset_on_change boolean NOT NULL DEFAULT true,
  
  forked_from_sop_id uuid REFERENCES public.sops(id),
  
  -- guard: system rows should have org_id null and system_key not null
  CHECK (
    (source = 'system' AND org_id IS NULL AND system_key IS NOT NULL) OR
    (source = 'org' AND org_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_sops_org_id ON public.sops(org_id);
CREATE INDEX idx_sops_source ON public.sops(source);
CREATE INDEX idx_sops_system_key ON public.sops(system_key);

-- Enable RLS
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_sops_updated_at
  BEFORE UPDATE ON public.sops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to increment version on content/title change
CREATE OR REPLACE FUNCTION public.increment_sops_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.content_md IS DISTINCT FROM NEW.content_md OR OLD.title IS DISTINCT FROM NEW.title THEN
    NEW.version := COALESCE(OLD.version, 0) + 1;
    -- Increment ack_epoch if ack_reset_on_change is true
    IF NEW.ack_reset_on_change = true THEN
      NEW.ack_epoch := COALESCE(OLD.ack_epoch, 0) + 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER increment_sops_version_trigger
  BEFORE UPDATE ON public.sops
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_sops_version();

-- RLS Policies

-- Everyone can view system SOPs
CREATE POLICY "Anyone can view system SOPs"
ON public.sops
FOR SELECT
USING (source = 'system' AND org_id IS NULL);

-- Users can view their org's SOPs
CREATE POLICY "Users can view their org SOPs"
ON public.sops
FOR SELECT
USING (
  org_id IS NOT NULL AND
  org_id = public.get_user_org_id(auth.uid())
);

-- Org admins can insert org SOPs
CREATE POLICY "Org admins can insert SOPs"
ON public.sops
FOR INSERT
WITH CHECK (
  source = 'org' AND
  org_id IS NOT NULL AND
  public.is_org_admin(auth.uid(), org_id)
);

-- Org admins can update their org SOPs
CREATE POLICY "Org admins can update their org SOPs"
ON public.sops
FOR UPDATE
USING (
  source = 'org' AND
  org_id IS NOT NULL AND
  public.is_org_admin(auth.uid(), org_id)
);

-- Org admins can delete their org SOPs
CREATE POLICY "Org admins can delete their org SOPs"
ON public.sops
FOR DELETE
USING (
  source = 'org' AND
  org_id IS NOT NULL AND
  public.is_org_admin(auth.uid(), org_id)
);