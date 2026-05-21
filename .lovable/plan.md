## Guided First-Session Onboarding Wizard

### Database changes (one migration)

1. `orgs.onboarding_welcome_message text` (nullable) — admin-configurable welcome paragraph.
2. `profiles.onboarding_completed_at timestamptz` (nullable) — set once all originally-assigned sections have passing quiz attempts.
3. Trigger on `quiz_attempts` (AFTER INSERT): when a passing attempt is inserted, check if the user has passing attempts for every section assigned to them at signup. If yes and `onboarding_completed_at` is NULL, set it. ("Originally assigned at signup" interpretation: the sections currently assigned to that user via `get_user_assigned_sops` — simplest, and matches reality for new hires whose assignments rarely change before they finish onboarding.)

### Frontend

**`src/hooks/useOnboardingStatus.ts`** (new) — returns `{ shouldShow, loading }`:
- `shouldShow = true` when `profiles.onboarding_completed_at IS NULL` AND `section_progress` has zero rows for the user.

**`src/components/onboarding/OnboardingWizard.tsx`** (new) — full-screen modal with 3 steps:
1. **Welcome** — org logo, tagline, `onboarding_welcome_message`, Continue button.
2. **Disclaimer** — reuse existing disclaimer text; checkbox + Accept writes to `disclaimer_acceptances` (skip insert if a row already exists for this user).
3. **Your sections** — fetches `get_user_assigned_sops`, lists titles with "~5 min read" each, total estimated time, Start button.
4. On Start: navigate to the first assigned section's reader view (use existing SOP route, e.g. `/sops/:id` — confirm route while implementing).

**Wizard gating** — render in `src/pages/Dashboard.tsx` (or the top-level user dashboard) above the normal content when `shouldShow`. Do not block admins.

**Admin "Restart onboarding"** — in the existing employee management UI (the per-user actions menu in `src/pages/admin/...` or `OrgMembers` view), add a button that:
- Clears `profiles.onboarding_completed_at` to NULL for that user.
- Deletes that user's rows from `section_progress` (so the gate trips again).
- Confirms with a toast.

### Admin settings UI

In `OrgBrandingCard` (or wherever org tagline lives), add a textarea for `onboarding_welcome_message` (max ~500 chars). Saves to `orgs`.

### Out of scope

- No new quiz/grading logic — the trigger just observes `quiz_attempts.passed`.
- No changes to disclaimer copy or to the section reader.
- Re-onboarding after a user gains new section assignments: not handled (one-shot per user).
