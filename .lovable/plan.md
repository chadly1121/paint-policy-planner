## Sprint 3 — UX & UI cleanup

Six grouped changes shipped together. Below is the plan for each part with the specific files touched and any decisions I'll resolve before coding.

---

### Part 1 — Remove Document Builder

- Delete `src/pages/DocumentBuilder.tsx`.
- Delete edge functions `document-builder` and `drive-save-builder-doc` (code + dashboard via `delete_edge_functions`, remove from `supabase/config.toml`).
- Remove the `/builder` route + import from `src/App.tsx`.
- Remove "Document Builder" item from sidebar nav.
- Grep for `DocumentBuilder`, `document-builder`, `drive-save-builder-doc`, `/builder` and clean up any stragglers (hooks, types, references).
- Verify build.

### Part 2 — Stop auto-creating placeholder templates

- In `supabase/functions/drive-create-folders/index.ts`, strip the block that creates the 6 starter Google Doc templates. Keep folder creation (Policies, SOPs, Safety, Training, Disciplinary, Forms, SDS, Incident-Reports, Employee-Credentials).
- No data backfill; admins clean existing placeholders themselves.

### Part 3 — Sidebar grouping

- Rewrite `src/components/layout/Sidebar.tsx` from flat `navItems` to a `navSections` array with 5 groups (Dashboard ungrouped, Documents, Report, Me, Admin Only).
- Render group headers with `text-xs uppercase tracking-wider text-muted-foreground mb-1 mt-4`. Ungrouped items render with no header.
- Search filter flattens across groups when `searchQuery` is non-empty; no headers in search results.
- Add i18n keys to all 4 locales (en/es/fr/tl):
  - `nav.documents`, `nav.report`, `nav.me`, `nav.adminOnly`
  - `nav.sds`, `nav.forms`, `nav.incidentReports`, `nav.myProfile`, `nav.settings`, `nav.adminPanel`

### Part 4 — Header consistency

- Refactor the global header (likely `src/components/layout/Header.tsx`):
  - Left: hamburger (mobile) + org logo + org name from `useOrganization`
  - Right: language toggle + user avatar dropdown
  - Remove the per-page H1 prop and the tagline.
- Audit each page (Policies, SOPs, Safety, SDS, Training, Disciplinary, Forms, Incidents, Profile, Settings, Admin, Index) to ensure they render their own H1 as the first content element. Add where missing.

### Part 5 — Dashboard polish (`src/pages/Index.tsx`)

1. **Welcome banner** — pull `org_name` + `tagline` + `onboarding_welcome_message` from `useOrganization`. Default text "Welcome to {orgName}'s training portal". i18n key `dashboard.welcome` with `{{orgName}}` interpolation. Tagline rendered below in muted italic, hidden when empty.
2. **Dynamic `totalSections`** — count distinct doc categories with ≥1 doc visible to user (target categories: Policies, SOPs, Safety, SDS, Training, Disciplinary, Forms). If 0, hide `<CertificateGenerator />` entirely.
3. **Working at Heights duplicate** — keep the "Expired" card, filter Recent Activity to exclude cert events older than 60 days (also de-dupes against the expired-card display).
4. **Redeem Points button** — in `PointsDisplay`, hide the button when `availablePoints === 0` and render greyed guidance text "Earn points by completing acknowledgements to redeem rewards." instead.
5. **Five empty stars** — grep for "streak" first. If no streak logic exists, remove the cluster outright.

### Part 6 — Translation key cleanup

- Audit hardcoded user-facing strings in `Index.tsx`, `IncidentReports.tsx`, `Admin.tsx`, `InvitationsManager.tsx`, `AcceptInvite.tsx`. Move to i18n keys and add translations for en/es/fr/tl. Scope: visible labels, buttons, empty states, toast titles — not internal log strings.

---

### Order of execution

1. Part 1 deletions (rip out Document Builder first so nothing else references it).
2. Part 2 edge function cleanup.
3. Part 4 header refactor + per-page H1 audit (sets the layout baseline).
4. Part 3 sidebar grouping + nav i18n keys.
5. Part 5 dashboard polish.
6. Part 6 translation key sweep.
7. Final grep for orphan references + build verification.

### Notes / open items

- **Section count for CertificateGenerator**: I'll use a `useMemo` derived count from existing document queries already in `Index.tsx` (whichever hooks list category doc counts). If counts aren't available in one hook, I'll add a lightweight aggregate query.
- **Tagline removal from header**: confirming the header is the only place to remove — I won't strip it from the dashboard banner, where Part 5 explicitly wants it.
- **i18n locale files**: I'll match the existing key style/casing in `src/locales/*.json` (or equivalent).
- I will NOT delete the cron-scheduled `drive-sync-cron` or any cron migrations — those are unrelated.
