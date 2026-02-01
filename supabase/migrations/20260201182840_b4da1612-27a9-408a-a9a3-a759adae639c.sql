-- Cleanup migration: Remove locally stored document content for Drive-migrated records
-- This is a one-time migration to make Google Drive the single source of truth
-- Guardrail: Only affects records with a valid drive_file_id

-- 1. Clean up SOPs content_md where drive_file_id exists
UPDATE public.sops
SET content_md = '<!-- Content stored in Google Drive -->'
WHERE drive_file_id IS NOT NULL 
  AND drive_file_id != ''
  AND content_md != '<!-- Content stored in Google Drive -->';

-- 2. Clean up company_policies content where drive_file_id exists
UPDATE public.company_policies
SET content = '<!-- Content stored in Google Drive -->'
WHERE drive_file_id IS NOT NULL 
  AND drive_file_id != ''
  AND content != '<!-- Content stored in Google Drive -->';

-- 3. Clean up company_safety content where drive_file_id exists
UPDATE public.company_safety
SET content = '<!-- Content stored in Google Drive -->'
WHERE drive_file_id IS NOT NULL 
  AND drive_file_id != ''
  AND content != '<!-- Content stored in Google Drive -->';

-- 4. Clean up company_training content where drive_file_id exists
UPDATE public.company_training
SET content = '<!-- Content stored in Google Drive -->'
WHERE drive_file_id IS NOT NULL 
  AND drive_file_id != ''
  AND content != '<!-- Content stored in Google Drive -->';

-- 5. Clean up company_disciplinary content where drive_file_id exists
UPDATE public.company_disciplinary
SET content = '<!-- Content stored in Google Drive -->'
WHERE drive_file_id IS NOT NULL 
  AND drive_file_id != ''
  AND content != '<!-- Content stored in Google Drive -->';

-- 6. Log this cleanup as an admin action in audit_logs
INSERT INTO public.audit_logs (user_id, action, table_name, new_data)
SELECT 
  auth.uid(),
  'drive_content_cleanup_migration',
  'multiple_tables',
  jsonb_build_object(
    'description', 'One-time migration to remove locally stored content for Drive-migrated documents',
    'tables_affected', ARRAY['sops', 'company_policies', 'company_safety', 'company_training', 'company_disciplinary'],
    'guardrail', 'Only records with valid drive_file_id were cleaned',
    'executed_at', now()
  )
WHERE auth.uid() IS NOT NULL;

-- If no authenticated user, still log with a system user placeholder
INSERT INTO public.audit_logs (user_id, action, table_name, new_data)
SELECT 
  '00000000-0000-0000-0000-000000000000'::uuid,
  'drive_content_cleanup_migration',
  'multiple_tables',
  jsonb_build_object(
    'description', 'One-time migration to remove locally stored content for Drive-migrated documents',
    'tables_affected', ARRAY['sops', 'company_policies', 'company_safety', 'company_training', 'company_disciplinary'],
    'guardrail', 'Only records with valid drive_file_id were cleaned',
    'executed_at', now()
  )
WHERE NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE action = 'drive_content_cleanup_migration');