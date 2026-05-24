
-- Delete dependent data first
TRUNCATE TABLE
  public.audit_logs,
  public.disclaimer_acceptances,
  public.section_item_progress,
  public.section_progress,
  public.quiz_attempts,
  public.quiz_questions,
  public.sop_acks,
  public.sop_acknowledgments,
  public.sop_acks_migration_orphans,
  public.doc_reack_required,
  public.sop_assignments,
  public.certificates,
  public.awards,
  public.redemption_requests,
  public.redemption_items,
  public.incident_reports,
  public.sds_documents,
  public.points_balance,
  public.company_policies,
  public.company_sops,
  public.company_safety,
  public.company_training,
  public.company_disciplinary,
  public.company_forms,
  public.company_settings,
  public.drive_file_metadata,
  public.document_relationships,
  public.org_hidden_sops,
  public.org_drive_folders,
  public.org_ai_settings,
  public.org_subscriptions,
  public.org_settings,
  public.org_users,
  public.user_roles,
  public.profiles
RESTART IDENTITY CASCADE;

-- Delete user-created SOPs (keep system SOPs where org_id IS NULL)
DELETE FROM public.sop_role_assignments WHERE sop_id IN (SELECT id FROM public.sops WHERE org_id IS NOT NULL);
DELETE FROM public.sops WHERE org_id IS NOT NULL;

-- Delete user Drive tokens
DELETE FROM public.user_drive_tokens;

-- Delete organizations
DELETE FROM public.orgs;

-- Delete all auth users (cascades to identities, sessions, etc.)
DELETE FROM auth.users;
