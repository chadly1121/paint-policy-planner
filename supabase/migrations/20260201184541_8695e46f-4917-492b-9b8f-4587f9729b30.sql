-- Allow NULL for content fields in document tables (Drive is now source of truth)

-- SOPs table
ALTER TABLE public.sops ALTER COLUMN content_md DROP NOT NULL;

-- company_policies table  
ALTER TABLE public.company_policies ALTER COLUMN content DROP NOT NULL;

-- company_safety table
ALTER TABLE public.company_safety ALTER COLUMN content DROP NOT NULL;

-- company_training table
ALTER TABLE public.company_training ALTER COLUMN content DROP NOT NULL;

-- company_disciplinary table
ALTER TABLE public.company_disciplinary ALTER COLUMN content DROP NOT NULL;