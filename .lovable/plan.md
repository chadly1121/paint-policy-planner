## Sprint 4 — Granular permissions + OHSA roles

Seven parts, shipped together. Order chosen so each step has its dependencies in place.

---

### Part 1 — DB: permission helpers + OHSA flags (one migration)

Single migration containing:

**Helper functions** (`SECURITY DEFINER`, `search_path=public`):
- `get_user_org_role(uuid, uuid) → text`
- `is_org_office(uuid, uuid) → boolean`
- `is_org_foreman(uuid, uuid) → boolean`
- `can_manage_employees(uuid, uuid)` — admin OR office
- `can_approve_time(uuid, uuid)` — admin OR office OR foreman
- `can_manage_rewards(uuid, uuid)` — admin OR office

**`org_users` OHSA columns:**
- `is_hsr boolean NOT NULL DEFAULT false`
- `is_safety_supervisor boolean NOT NULL DEFAULT false`
- `hsr_designated_at timestamptz`
- `hsr_training_completed_at date`
- `safety_supervisor_designated_at timestamptz`
- `CHECK (is_hsr=false OR role IN ('painter','other'))` named `hsr_must_be_worker`
- Partial unique index: one `is_hsr=true` per `org_id`

**Trigger** `enforce_single_hsr_per_org`: BEFORE INSERT/UPDATE on `org_users` — when `NEW.is_hsr=true`, set all other rows in same org to `is_hsr=false`. Avoids relying on app code for uniqueness and prevents the partial unique index from blocking the swap.

---

### Part 2 — RLS tightening (same migration)

- `org_users` SELECT: replace existing "view org members" policy with two — `can_manage_employees(auth.uid(), org_id)` for full visibility, plus self-row visibility. Keep existing admin INSERT/UPDATE/DELETE policies (only admin can change roles).
- `profiles` SELECT: keep self-view, add an org-scoped "admins and office can view org member profiles" policy using `can_manage_employees`.
- `redemption_items`: replace `is_org_admin` ALL policy with `can_manage_rewards` for write, keep member SELECT.
- Leave `org_settings`, `org_drive_folders`, `org_ai_settings`, `orgs` (branding) admin-only — already correct.

I will NOT touch `org_users` UPDATE policy beyond what's needed — admin-only role changes stay, but admin-only `is_hsr`/`is_safety_supervisor` writes are fine since flag toggles are admin-only UI per spec.

---

### Part 3 — Frontend permission hook + replacements

- New `src/hooks/usePermissions.ts` reading from `useOrg()` (the existing `OrganizationContext` already exposes `orgUser`). Returns `isAdmin`, `isOffice`, `isForeman`, `isPainter`, `isOther`, `isHsr`, `isSafetySupervisor`, plus the composite booleans listed in spec.
- Extend `OrgRole`/`OrgUser` types in `useOrganization.ts` with the new OHSA fields so the hook can read them.
- Replace `isAdmin` gating in: `Sidebar.tsx` (admin section visible when `isAdmin || isOffice`), `Admin.tsx` (per-tab gating), `InvitationsManager.tsx` (`canManageEmployees`), `RedemptionItemsManager.tsx` (`canManageRewards`), incident review buttons (`canUpdateIncidents` = admin only).
- Sidebar group label stays "Admin"; tabs inside Admin page are filtered by permission.

---

### Part 4 — HSR / Safety Supervisor designation UI

- Extend `EmployeeActions.tsx` (or wrap the row in `InvitationsManager.tsx` member list) with two new controls per active employee:
  - HSR toggle — disabled when `role ∈ {admin, foreman, office}` with tooltip. Opens a small dialog asking for `hsr_training_completed_at` date (required) before flipping the flag.
  - Safety Supervisor toggle — simple flip, multiple allowed.
- Show a green shield icon (lucide `ShieldCheck`) next to safety supervisors in the list, and an orange "HSR" badge next to the HSR.
- New `OHSAComplianceCard.tsx` mounted at top of Employees tab:
  - Counts active `org_users`.
  - Logic: 6–19 + no HSR → red; HSR designated but training null or >3y → amber with IHSA link; 20+ → blue JHSC notice; otherwise green "Compliant".

---

### Part 5 — Dashboard "Your Safety Reps" card

- New `src/components/dashboard/SafetyRepsCard.tsx` shown on `Index.tsx` to all roles.
- Queries `org_users` joined with `profiles` for `org_id = current` and (`is_hsr=true` OR `is_safety_supervisor=true`).
- Displays HSR (name + avatar + email/phone link) and Safety Supervisor(s). Buttons: "File an Incident" → `/incidents`, "Contact HSR" → `mailto:` using profile email.

---

### Part 6 — Edge function server-side checks

Update these to verify caller role using the new helpers (use `supabase.rpc('can_manage_employees', {...})` or direct query against `org_users`):

- `send-invitation` — require `can_manage_employees`
- `admin-create-employee` — already checks admin; loosen to `can_manage_employees` for create, but keep admin-only for role changes
- `accept-invitation` — unchanged (token-gated)
- Reward endpoints — none exist as edge fns (managed via RLS directly); covered by Part 2.
- Drive admin endpoints (`drive-create-folders`, `drive-revoke`, `ai-connect`, `ai-revoke`) — keep admin-only; add explicit check if missing.
- Incident update — handled via RLS (`is_org_admin`), no edge fn to update; leave as is.

---

### Part 7 — i18n + verification

- Add minimal i18n keys for new UI strings (4 locales): `ohsa.*`, `safetyReps.*`, `employees.designateHsr`, `employees.designateSafetySup`, etc.
- Verification: build passes; spot-check the new dashboard card on Index; manual click-through deferred to user testing per spec.

---

### Technical notes

- Single migration combines Parts 1–2 to keep RLS updates atomic with the helpers they depend on.
- HSR uniqueness enforced by trigger (auto-unset others) rather than failing the insert, so admin can re-designate without manual unset.
- `usePermissions` is a pure derived hook — no extra fetches, reuses existing `OrganizationContext`.
- Types regenerate automatically after migration; no manual `types.ts` edit.

Ready to ship on approval.