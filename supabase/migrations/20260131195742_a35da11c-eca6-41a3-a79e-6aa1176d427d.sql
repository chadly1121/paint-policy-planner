-- Add drive_file_id column to all document tables for Drive-first architecture

-- Update sops table to rename source_file_url to drive_file_id for consistency
ALTER TABLE public.sops 
ADD COLUMN IF NOT EXISTS drive_file_id TEXT;

-- Add drive_file_id to company_policies
ALTER TABLE public.company_policies 
ADD COLUMN drive_file_id TEXT,
ADD COLUMN drive_folder_id TEXT;

-- Add drive_file_id to company_safety
ALTER TABLE public.company_safety 
ADD COLUMN drive_file_id TEXT,
ADD COLUMN drive_folder_id TEXT;

-- Add drive_file_id to company_training
ALTER TABLE public.company_training 
ADD COLUMN drive_file_id TEXT,
ADD COLUMN drive_folder_id TEXT;

-- Add drive_file_id to company_disciplinary
ALTER TABLE public.company_disciplinary 
ADD COLUMN drive_file_id TEXT,
ADD COLUMN drive_folder_id TEXT;

-- Add folder types for other modules to org_drive_folders
COMMENT ON COLUMN public.org_drive_folders.folder_type IS 'Folder types: root, sops, policies, safety, training, disciplinary, employee-credentials';

-- Add index for faster lookups by drive_file_id
CREATE INDEX IF NOT EXISTS idx_sops_drive_file_id ON public.sops(drive_file_id) WHERE drive_file_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_policies_drive_file_id ON public.company_policies(drive_file_id) WHERE drive_file_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_safety_drive_file_id ON public.company_safety(drive_file_id) WHERE drive_file_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_training_drive_file_id ON public.company_training(drive_file_id) WHERE drive_file_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_disciplinary_drive_file_id ON public.company_disciplinary(drive_file_id) WHERE drive_file_id IS NOT NULL;