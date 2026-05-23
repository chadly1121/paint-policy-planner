# Doc-Change Re-Acknowledgement Workflow

Wire up the full user-facing workflow for the existing `ack_reset_on_change` infrastructure. POL-010 §4.4: users have 14 days (org-configurable) to re-acknowledge updated docs.

## 1. Database (single migration)

**New table `public.doc_reack_required`:**
- `id uuid PK default gen_random_uuid()`
- `org_id uuid NOT NULL` (FK orgs)
- `org_user_id uuid NOT NULL` (FK org_users)
- `user_id uuid NOT NULL` (denormalized for query convenience + RLS)
- `sop_id uuid NOT NULL` (FK sops)
- `new_ack_epoch int NOT NULL`
- `previous_ack_epoch int NOT NULL`
- `detected_at timestamptz NOT NULL DEFAULT now()`
- `first_notified_at timestamptz`
- `sent_overdue_at timestamptz`
- `reack_deadline timestamptz NOT NULL`
- `completed_at timestamptz`
- UNIQUE `(org_user_id, sop_id, new_ack_epoch)`
- RLS: user sees own rows; org admins see org rows; service role manages all

**New org columns:**
- `orgs.reack_grace_days int NOT NULL DEFAULT 14`
- `orgs.auto_block_uncompliant boolean NOT NULL DEFAULT false`

**New trigger on `sops`:** AFTER UPDATE where `ack_epoch` increments → for each user with a `sop_acks` row at the previous epoch (and same `org_id` resolvable), insert a `doc_reack_required` row with `reack_deadline = now() + (orgs.reack_grace_days || 14) days`. ON CONFLICT DO NOTHING.

**New trigger on `sop_acks`:** AFTER INSERT → if a matching open `doc_reack_required` row exists for `(user_id, sop_id, new_ack_epoch = NEW.ack_epoch)`, set `completed_at = now()`.

## 2. Edge functions

**`reack-notifier`** (daily 08:00 UTC):
- Fetch open rows where `completed_at IS NULL`.
  - If `first_notified_at IS NULL` → invoke `send-notification` with `type: 'doc_change_alert'` (doc title, change_summary if column exists, deadline). Set `first_notified_at = now()`.
  - Else if `now() > reack_deadline AND sent_overdue_at IS NULL` → notify user (`reack_overdue`) and each org admin. Set `sent_overdue_at = now()`.
- Returns `{processed, alerts_sent, overdue_sent}`.

**`reack-monthly-digest`** (1st of month 08:00 UTC):
- Group open rows by `user_id`; skip empty groups; one `monthly_reack_digest` email per user listing all pending sorted by deadline asc.

**Cron via `supabase--insert`** (per scheduling guide — not migration).

## 3. `send-notification` additions

Add three cases: `doc_change_alert`, `reack_overdue`, `monthly_reack_digest`. Each branded HTML with deadline and CTA back to dashboard. Extend `NotificationRequest.data` with `docTitle`, `changeSummary`, `reackDeadline`, `pendingItems[]`.

## 4. UI

**`src/components/dashboard/PendingReacksCard.tsx`** (new):
- Fetches own open rows; if 0, render nothing.
- Shows count, most-urgent deadline (with overdue badge), button → `/sops?reack=<sop_id>` for the most urgent.

**`src/pages/Index.tsx`:** mount `PendingReacksCard` above the welcome card.

**`src/components/admin/ReackStatusCard.tsx`** (new):
- Lists users in org with open rows; columns: name, pending count, overdue count, oldest deadline. Sortable.

**`src/pages/Admin.tsx`:** add card to admin tab.

**`src/components/admin/OrgSettingsCard.tsx`** (extend or new section): inputs for `reack_grace_days` and `auto_block_uncompliant`.

## 5. Auto-completion path
Trigger handles it server-side; no client change needed beyond ensuring `sop_acks` insert uses correct `ack_epoch`.

## 6. Testing
Note in closing message: bump a sop's `ack_epoch` manually to verify trigger fires; invoke `reack-notifier` manually via admin button (optional, not building now).

## Technical details
- Trigger uses `org_users.org_id` lookup for each acker.
- For system SOPs (no org_id on sops), pull org from `org_users` of the acker.
- All edge functions: `verify_jwt = false`, manual JWT for admin trigger if exposed, but scheduled invocations use service role.
- Cron scheduled with `supabase--insert` (contains anon key + URL).
- No changes to `process-document`/`generate-quiz` (already done).

## Out of scope (won't do unless asked)
- Auto-block enforcement logic in assignment paths (column stored only; wiring later).
- Localizing email copy.
- Manual "run reack-notifier now" admin button.
