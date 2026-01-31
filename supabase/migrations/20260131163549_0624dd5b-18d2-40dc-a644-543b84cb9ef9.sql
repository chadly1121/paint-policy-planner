-- =============================================
-- Phase 0: Google Drive Integration Schema
-- =============================================

-- User-bound Drive tokens with multi-connection support
CREATE TABLE public.user_drive_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  
  -- Provider identification
  provider TEXT NOT NULL DEFAULT 'google',
  
  -- Google identity
  google_subject TEXT NOT NULL,           -- Google's unique user ID (sub claim)
  google_email TEXT NOT NULL,             -- For display/audit
  
  -- Encrypted credentials (AES-256-GCM via Edge Function)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  
  -- Token refresh tracking
  last_refresh_at TIMESTAMPTZ,
  last_refresh_error TEXT,
  
  -- Connection management
  is_primary BOOLEAN DEFAULT false,       -- Primary connection for org operations
  is_active BOOLEAN DEFAULT true,         -- Soft revoke without deletion
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- One token per Google account per user
  UNIQUE(user_id, google_subject)
);

-- Enforce only one primary connection per org
CREATE UNIQUE INDEX idx_one_primary_per_org 
ON public.user_drive_tokens (org_id) 
WHERE is_primary = true AND is_active = true;

-- Index for token lookups
CREATE INDEX idx_user_drive_tokens_org ON public.user_drive_tokens(org_id);
CREATE INDEX idx_user_drive_tokens_user ON public.user_drive_tokens(user_id);

-- Enable RLS
ALTER TABLE public.user_drive_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_drive_tokens
CREATE POLICY "Users can view their own tokens"
ON public.user_drive_tokens
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
ON public.user_drive_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id AND org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can update their own tokens"
ON public.user_drive_tokens
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Org admins can view org tokens"
ON public.user_drive_tokens
FOR SELECT
USING (is_org_admin(auth.uid(), org_id));

-- Org Drive folder registry
CREATE TABLE public.org_drive_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = org-level folder
  
  folder_type TEXT NOT NULL,              -- 'root', 'sops', 'policies', 'safety', 'training', 'credentials'
  drive_folder_id TEXT NOT NULL,          -- Google Drive folder ID
  drive_folder_name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES public.org_drive_folders(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.org_users(id),
  
  -- One folder type per org/user combination
  UNIQUE(org_id, user_id, folder_type)
);

-- Index for folder lookups
CREATE INDEX idx_org_drive_folders_org ON public.org_drive_folders(org_id);
CREATE INDEX idx_org_drive_folders_user ON public.org_drive_folders(user_id);
CREATE INDEX idx_org_drive_folders_type ON public.org_drive_folders(folder_type);

-- Enable RLS
ALTER TABLE public.org_drive_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for org_drive_folders
CREATE POLICY "Users can view their org folders"
ON public.org_drive_folders
FOR SELECT
USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org admins can manage org folders"
ON public.org_drive_folders
FOR ALL
USING (is_org_admin(auth.uid(), org_id))
WITH CHECK (is_org_admin(auth.uid(), org_id));

CREATE POLICY "Users can view their own credential folders"
ON public.org_drive_folders
FOR SELECT
USING (user_id = auth.uid());

-- Trigger to update updated_at on user_drive_tokens
CREATE TRIGGER update_user_drive_tokens_updated_at
BEFORE UPDATE ON public.user_drive_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();