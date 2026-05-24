# `public.sops` Consolidation Plan

**Status:** Proposal — no code or schema changes yet. Review and choose a path before any execution.

## 1. Background

Two parallel content systems exist:

- **`public.sops`** — the original single-table model. Currently used as a Drive **index** (one row per Drive file across *all* categories), with legacy `content_md`, `version`, `ack_epoch`, `status`, `source`, `system_key`, `drive_file_id`, `drive_modified_time`, `doc_id_external` columns.
- **`public.company_{policies,sops,safety,training,disciplinary,forms}`** — newer per-category tables that hold actual content (`content`, `parsed_sections`, `drive_file_id`, `drive_modified_time`, `doc_id_external`, `video_url`, `version`).

Per project memory, **Drive is the source of truth** and DB `content` / `content_md` must be `NULL`. So `sops` is effectively a pointer/index table today, but it still carries acknowledgement state (`ack_epoch`) and is the FK target for the re-ack and acknowledgement subsystems.

---

## 2. Audit — current usage of `public.sops`

### 2.1 Writes (insert / update / delete)

| Location | Operation | Notes |
|---|---|---|
| `supabase/functions/drive-sync/index.ts` | INSERT / UPDATE / mark `status='removed_from_drive'` | Primary writer. Syncs Drive file list into `sops` rows; only writes metadata (title, drive_file_id, drive_modified_time, doc_id_external, status). Does **not** populate `content_md`. |
| `supabase/functions/drive-bulk-export/index.ts` | INSERT / UPDATE (fork system → org rows, set drive_file_id after export) | Legacy migration tool for one-time DB→Drive export. |
| `src/hooks/useOrgSops.ts` | INSERT / UPDATE / DELETE / status='archived' | Admin SOP CRUD UI (legacy SOP editor path). |
| `supabase/migrations/20260107135115_*.sql`, `20260107135206_*.sql` | INSERT system SOP seeds | Historic data load. |

### 2.2 Reads

| Location | Purpose |
|---|---|
| `supabase/functions/generate-quiz/index.ts` | Reads `drive_modified_time` as a cache-busting key. |
| `supabase/functions/sop-assistant/index.ts` | Reads `id, title, drive_file_id` to enumerate org SOPs for the assistant. |
| `supabase/functions/reack-notifier/index.ts` | Reads `title` for re-ack email body. |
| `supabase/functions/reack-monthly-digest/index.ts` | Reads `id, title` to label digest entries. |
| `supabase/functions/drive-bulk-export/index.ts` | Reads existing rows for fork detection. |
| `src/hooks/useOrgSops.ts` | Lists `status='active'` SOPs for admin UI. |
| `src/hooks/useSOPAssignments.ts` | Looks up `id, ack_epoch, version, org_id` by `system_key` to drive ack flow. |
| `src/components/dashboard/AssignedTasks.tsx` | Joins `id → drive_file_id` for assigned SOP cards. |
| `src/components/dashboard/PendingReacksCard.tsx` | Joins `id → title` for re-ack list. |
| `src/components/dashboard/RecentActivity.tsx` | Lists Drive-backed SOPs for activity. |
| `src/components/gamification/PointsDisplay.tsx` | Counts Drive-linked org SOPs. |
| `src/pages/SOPs.tsx`, `src/components/layout/Sidebar.tsx` | Indirect via the above hooks. |
| `public.get_user_assigned_sops()` (DB function) | Returns assignments joined to `sops`. |
| `public.has_acknowledged_sop()` (DB function) | Joins `sop_acks → sops` on `ack_epoch`. |
| `public.mark_onboarding_complete_if_done()` | Uses `get_user_assigned_sops` (transitively). |
| `public.migrate_sop_acknowledgments_to_sop_acks()` | One-shot migration helper. |

### 2.3 Triggers attached to `public.sops`

- `trg_increment_sops_version` → `increment_sops_version()` — bumps `version` and `ack_epoch` on material change.
- `trg_enqueue_doc_reack` → `enqueue_doc_reack_on_epoch_change()` — fans out `doc_reack_required` rows.
- `trg_invalidate_quiz_cache_drive_modified` → `invalidate_quiz_cache_on_drive_modified()` — clears `quiz_questions` cache.
- `update_sops_updated_at` (standard timestamp trigger).
- RLS policies on `sops` (system vs org visibility).

### 2.4 Foreign keys *referencing* `public.sops(id)`

| Referencing table | Column | On delete |
|---|---|---|
| `public.sop_acks` | `sop_id` | CASCADE |
| `public.sop_role_assignments` | `sop_id` | CASCADE |
| `public.doc_reack_required` | `sop_id` | CASCADE |
| `public.sops` (self) | `forked_from_sop_id` | — |

### 2.5 Companion table: `public.sop_acknowledgments` (DEPRECATED)

Already replaced by `sop_acks` with a deprecation warning trigger. Out of scope here except as a precedent for the dual-write → cutover → drop pattern.

---

## 3. Two paths

### Path A — Drop `sops`, repoint everything to `company_*`

`drive-sync` writes directly into the appropriate `company_{policies,sops,safety,training,disciplinary,forms}` table based on the Drive subfolder. Acknowledgement state (`ack_epoch`, `version`) lives on `company_*` rows. The `sop_acks` / `doc_reack_required` / `sop_role_assignments` FKs become polymorphic — either a `(category, id)` pair or per-category FK columns.

**Pros**
- One physical home per document. No parallel system.
- `parsed_sections`, `drive_modified_time`, `content`, ack state co-located.
- Matches the "Source of Truth = Drive, mirrored per category" model already used by content code.

**Cons**
- Polymorphic FKs in Postgres are awkward. Realistic options:
  1. Six nullable FK columns per ack table (`policy_id`, `sop_id`, `safety_id`, …) with a CHECK constraint that exactly one is set. Verbose but typesafe.
  2. A `(doc_category text, doc_id uuid)` composite with no real FK — loses referential integrity.
  3. A thin `documents` view/table that unions the six tables, used as the FK target — essentially re-inventing `sops`.
- Every reader/writer of `sops` (14+ files) must be rewritten and category-aware.
- Triggers (`increment_sops_version`, `enqueue_doc_reack_on_epoch_change`, `invalidate_quiz_cache_on_drive_modified`) must be cloned across 6 tables.
- High-risk migration of `sop_acks` (live user acknowledgement records) to the new FK shape.
- **Risk: high. Effort: large (multi-week, several phases).**

### Path B — Formalize `sops` as the Drive index; `company_*` references it

Keep `sops` as the **single registry of every Drive file** the org has. Remove its legacy content columns (`content_md`). Each `company_*` row gains a `sop_id uuid REFERENCES public.sops(id)` and uses that as its canonical pointer, dropping its own `drive_file_id` / `drive_modified_time` (or keeping them as denormalized cache).

Acknowledgement triggers, re-ack fanout, and quiz cache invalidation continue to hang off `sops` (one place), which is correct because epoch/version semantics are document-identity concerns, not category concerns.

**Pros**
- Minimal code churn. The 14 call sites largely keep working.
- Existing FKs (`sop_acks.sop_id`, `doc_reack_required.sop_id`, `sop_role_assignments.sop_id`) stay valid.
- Triggers stay in one place. No cloning across six tables.
- Clear separation of concerns: `sops` = identity + lifecycle; `company_*` = parsed/typed content per category.
- Naming becomes the only awkward thing (the table is called `sops` but indexes all doc types). Renaming to `documents` is a separate, cosmetic migration.

**Cons**
- The "parallel system" isn't deleted — it's reframed. If the goal is *fewer tables*, this doesn't achieve that.
- `company_*` tables still carry their own `drive_file_id` / `drive_modified_time` until cleaned up; risk of drift during the transition.
- Needs a backfill to ensure every `company_*` row has a matching `sops` row.

**Risk: low–medium. Effort: small–medium (days, not weeks).**

---

## 4. Recommendation: **Path B**

Reasoning:

1. **Identity vs. content** are different concerns and the current schema already (accidentally) reflects that. `sops` is a good identity table for "a document that exists in Drive and has an ack lifecycle." `company_*` are good per-category content projections.
2. **Acknowledgement is the hardest thing to migrate** — `sop_acks` holds real user signatures with legal weight. Path A's polymorphic FK refactor puts those records at risk. Path B leaves them untouched.
3. **The re-ack and quiz-cache triggers are already correctly centralized on `sops`.** Path A would scatter them across six tables and require ack epoch bookkeeping in each.
4. **Renaming for clarity is cheap.** If "`sops`" is misleading because it indexes all doc types, that's a 1-line `ALTER TABLE … RENAME TO documents` plus a typegen refresh — independent of the architectural question.

If the team's real goal is "delete code, fewer moving parts," Path B + aggressive cleanup of the `company_*` tables' redundant drive columns gets ~80% of the win at ~20% of the risk.

---

## 5. If Path B is approved — phased rollout

Each phase is independently shippable and reversible.

### Phase 1 — Formalize the contract (schema only, no behavior change)
- Add `sop_id uuid REFERENCES public.sops(id) ON DELETE CASCADE` to each `company_*` table (nullable to start).
- Backfill: for every `company_*` row with a `drive_file_id`, find/create the matching `sops` row and set `sop_id`.
- Add a unique partial index on `company_*(sop_id) WHERE sop_id IS NOT NULL` to enforce 1:1.
- No code changes yet.

### Phase 2 — Make `drive-sync` the single Drive-index writer
- Audit `drive-sync` to confirm it covers every category subfolder (Policies, SOPs, Safety, Training, Disciplinary, Forms). Extend if any category is missing.
- Ensure `drive-sync` upserts into `sops` for *every* Drive file, regardless of category, with a category column (add `doc_category text` to `sops` if not present — derived from the Drive folder).
- Have `process-document` (which writes `company_*.parsed_sections`) also resolve and stamp `sop_id` on the company row.

### Phase 3 — Switch reads to canonical pointer
- Update the 14 call sites to dereference via `sops.id` (already mostly the case for acks/reacks).
- For places currently reading `company_*.drive_file_id` / `drive_modified_time` directly, switch to a join through `sop_id → sops`.
- Update `useOrgSops`, dashboard widgets, sop-assistant, generate-quiz to use `sops` as the canonical list and `company_*` for content/parsed sections.

### Phase 4 — Remove redundancy
- Mark `company_*.drive_file_id`, `drive_modified_time`, `doc_id_external` as deprecated; add an `AFTER INSERT/UPDATE` trigger that warns if they're set without a corresponding `sops` row.
- After one release cycle of clean logs: drop those columns.
- Drop `sops.content_md` (already should be NULL per Drive-source-of-truth rule).
- Tighten `company_*.sop_id` to `NOT NULL`.

### Phase 5 — (Optional) Rename for clarity
- `ALTER TABLE public.sops RENAME TO documents;`
- Rename FK columns from `sop_id` → `document_id` across `sop_acks`, `doc_reack_required`, `sop_role_assignments` (these names then become `document_acks`, `doc_reack_required`, `document_role_assignments`).
- This is purely cosmetic and can be deferred indefinitely.

---

## 6. What is NOT changing

- `sop_acks` schema (the legally-meaningful acknowledgement records).
- `doc_reack_required` schema and the re-ack workflow shipped in `20260523200218_*`.
- The Drive-as-source-of-truth rule.
- Quiz cache invalidation behavior.
- RLS policies on user-facing reads.

---

## 7. Decision needed

- [ ] **Approve Path B** and schedule Phase 1 (additive, zero-risk schema change + backfill).
- [ ] **Choose Path A** instead — accept the larger refactor and the `sop_acks` migration risk.
- [ ] **Defer** — keep status quo; revisit when a concrete pain point forces the issue.
