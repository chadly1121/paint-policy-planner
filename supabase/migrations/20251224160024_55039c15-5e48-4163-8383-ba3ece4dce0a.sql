-- =====================================================
-- SOP ASSIGNMENTS & ACKNOWLEDGMENTS SYSTEM
-- =====================================================

-- Table to track SOP assignments to roles
CREATE TABLE public.sop_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- The admin who created the assignment
  sop_key TEXT NOT NULL,
  assigned_role app_role NOT NULL,
  requires_acknowledgment BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sop_key, assigned_role)
);

-- Table to track user acknowledgments
CREATE TABLE public.sop_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- The user acknowledging
  sop_key TEXT NOT NULL,
  sop_version INTEGER NOT NULL DEFAULT 1,
  acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(user_id, sop_key, sop_version)
);

-- =====================================================
-- DISCLAIMER ACCEPTANCES (for admin editing toggle)
-- Already exists in schema, but let's verify it has what we need
-- =====================================================

-- =====================================================
-- VERSIONING: Add version tracking to company_sops and company_policies
-- =====================================================

-- Add version columns to company_sops
ALTER TABLE public.company_sops 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS edited_by UUID,
ADD COLUMN IF NOT EXISTS change_summary TEXT;

-- Add version columns to company_policies
ALTER TABLE public.company_policies 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS edited_by UUID,
ADD COLUMN IF NOT EXISTS change_summary TEXT;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.sop_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_acknowledgments ENABLE ROW LEVEL SECURITY;

-- SOP Assignments: Admins can manage for their company
CREATE POLICY "Admins can manage their SOP assignments"
ON public.sop_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

-- SOP Assignments: All authenticated users can view (to know what's assigned to them)
CREATE POLICY "Users can view SOP assignments"
ON public.sop_assignments
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- SOP Acknowledgments: Users can manage their own
CREATE POLICY "Users can view their own acknowledgments"
ON public.sop_acknowledgments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own acknowledgments"
ON public.sop_acknowledgments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all acknowledgments (for reporting)
CREATE POLICY "Admins can view all acknowledgments"
ON public.sop_acknowledgments
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at on sop_assignments
CREATE TRIGGER update_sop_assignments_updated_at
BEFORE UPDATE ON public.sop_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to increment version on company_sops update
CREATE OR REPLACE FUNCTION public.increment_sop_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
    NEW.version := COALESCE(OLD.version, 0) + 1;
    NEW.edited_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER increment_company_sops_version
BEFORE UPDATE ON public.company_sops
FOR EACH ROW
EXECUTE FUNCTION public.increment_sop_version();

-- Trigger to increment version on company_policies update
CREATE OR REPLACE FUNCTION public.increment_policy_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
    NEW.version := COALESCE(OLD.version, 0) + 1;
    NEW.edited_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;