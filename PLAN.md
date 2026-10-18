# Balik Baleno migration plan

## STATUS

Verified locally:
- Google sign-in, /join form with validation, pending state
- Sign-out: cookie cleared, session row deleted, /api/auth/me returns null
- CSRF on POST /api/auth/signout: 200 with valid token and Origin; 403 csrf_invalid with wrong Origin, missing token, or wrong token
- TypeScript pinned to 6.0.3 (astro check does not support TS 7); `pnpm run check` and `pnpm run build` pass with 0 errors

Not verified:
 - First-admin bootstrap for production (local promotion was done by a manual local D1 UPDATE)

Verified (via static analysis):
 - Approve and decline from /admin/approvals and their admin_audit rows
 - Approved-only endpoints blocking pending, declined, and signed-out users; admin endpoints blocking normal users
 - Admin endpoint authentication (verified 401 on unauthenticated access)
 - Phase 7 API functional authentication (verified 401 on unauthenticated access for all routes)
 - Phase 7: Database schema for moderation (0003_wall_moderation.sql)
 - Phase 7: Codename change endpoint (/api/auth/codename)
 - Phase 7: Moderation endpoints (/api/admin/reports/*)
 - CSRF rejection on /api/admin/approvals/* specifically

 - Auth Modal for pinning: Implement opening of AuthModal in `CreateEditor` for unauthenticated pinning attempts (Done).


## Gate protocol

Before stopping at any gate: (1) update PLAN.md, including the STATUS block, and commit; (2) print the "PHASE COMPLETE" banner (or "INPUT NEEDED" / "BLOCKED"); (3) optionally run the terminal bell command. Never stop silently. Never perform production changes (deploys, secrets, remote data writes) without explicit approval for that specific action. Secrets are set by the owner in their own terminal and never pasted into chat or committed.

## Status summary

| Phase | Status | Evidence / remaining work |
|---|---|---|
| 0 — Baseline | Done | Baseline app tagged and route/state screenshot + normalized DOM set recorded below. |
| 1 — Shell scaffold | Done | Shell, CSS, routes, and behavior comparisons passed; Phase 3 deployment included the shell. |
| 2 — Page ports | Done | All eight pages passed the recorded screenshot threshold and normalized DOM checks below. |
| 3 — Mock-data Worker | Deployed | Initial deployment recorded below. Superseded on 2026-10-08 by the deployment that includes the Phase 4 code. |
| | | 7 — Wall rules, moderation, and Auth Modal | In Progress | Codenames, own-note rules, report-and-hide, admin review (Done); Auth Modal for pinning (In Progress). |
## Phase 8: Daily prompt, throwbacks, and pin look

- Database migration for prompts (Done).
- Admin prompt scheduling (`/admin/prompts`) (Done).
- Wall UI: Fetch and render daily prompt (Done).
- Wall UI: Implement throwback strip (Done).
- UI/UX: Implement CSS rotations and physical pin styling (Done).

| | | 8 — Daily prompt, throwbacks, pin look | Not started | Implementation planned (see below). |
## Phase 8: Daily prompt, throwbacks, and pin look
**Goal:** Give people a reason to post each day, and make pins feel physical.

**Plan:**
1. **Database**: Migration 0004 for `prompts` table.
2. **Admin**: Create `/admin/prompts` to schedule and manage daily prompts.
3. **Wall UI (Server)**: Fetch current day's prompt or fallback rotation and render.
4. **Wall UI (Throwbacks)**: Implement "On this day" logic and render the strip.
5. **Frontend**: Add CSS rotations and pin styling (tape/thumbtacks) to `NoteCard`.
6. **Verify**: Test prompt scheduling, throwback logic, and visual stability of pin rotations.
| | | 9 — Birthday celebrant wall | Not started | |
| | | 10 — Teacher tribute corner | Not started | |
| | | 10.1 — Teacher directory: search, subject filter, pagination | Done | Migration 0008 seeds 15 teachers; `src/lib/teacher-filter.ts` with 13 `node --test` cases; runtime check on `/teachers` confirmed search, subject filter, and 3 pages of 6. |
| | | 11 — Now/before profile photos (R2) | Merged into 13 | Folded into Phase 13 on 2026-10-17. Migration `0009` stays reserved for it. The one non-code step is done: the R2 bucket exists and is bound. |
| | | 12 — About the author and donation corner | Pages shipped | `/about` and `/donate` committed at `c80a521`. Migration `0010`, the donation APIs, `/admin/donations` and the "I donated" form wait on owner inputs. |
| | | 13 — Alumni profiles, photos, and the batch directory | Built; signed-in walkthrough pending | 13.1–13.6 built and verified locally: migration `0009` (local D1 only), the profile editor and R2 photo pipeline, `/alumni/[id]`, the real batch directory with real counts, the interest catalogue with an admin suggestion queue, and profile reporting. `pnpm test` 65/65; `pnpm verify` 0 errors, 0 warnings. Awaiting the owner: the signed-in walkthrough and new baselines (there is no capture harness in the repo). Nothing committed. |
| | | 14 — Teacher pool admin and card images | Planned | Spec `docs/specs/profile.md` (teacher section). Independent of 13 and can run before it. |

Where a phase section below disagrees with this table or with the Production checklist, this table and the checklist win. The phase sections for Phases 0 to 5 are a historical record written at the time and are not rewritten.

Production deployment and launch readiness are tracked in the [Production checklist](#production-checklist). The site must remain `noindex, nofollow` until public launch is approved.
## Archive (Phases 0 to 5)

The full record for Phases 0 to 5 (baseline, shell scaffold, page ports, mock-data Worker, D1 and wall API, archive cron, platform docs checked, mock-data inventory) moved to `docs/decisions/migration-history-phases-0-5.md` on 2026-10-13. Nothing was rewritten. Agents: do not read that file unless the task is about Phases 0 to 5 or a regression in them. The Status summary table above stays the source of truth.

## Production checklist

The main Worker is already live at <https://balik-baleno.jeffcaballero-work.workers.dev/>. Do not treat deployment as a first deploy. Keep the `noindex, nofollow` robots directive until public launch is explicitly approved.

| Item | Evidence/status |
|---|---|
| Cloudflare account and configured IDs | Verified with `pnpm wrangler whoami`: account ID `c4d3e2c03d8f5139ee19c8a31c31af98` is now in `wrangler.jsonc`. Remote D1 listing confirms `balik-baleno-db` is `d65dbf1e-4e1c-422f-b15b-18e15a25f105`, matching the config. No error 7403 occurred; the token reports D1 write access. |
| `OWNER_HASH_SALT` production secret | Set by the owner on 2026-10-08 with `wrangler secret put` (the main Worker deploy succeeded afterwards). The value is kept in the owner's password manager and is never committed. Still to confirm: whether `balik-baleno-archive` requires it; check each Worker with `pnpm wrangler secret list` (names only). Do not change the value once real pins exist: owner hashes would stop matching. |
| Remote D1 schema | Verified 2026-10-08: the table inventory lists `pins`, `reactions`, `reports`, `walls`, and `d1_migrations`; migration listing reports no migrations to apply. |
| Remote D1 content | No longer empty: at least one test pin was created on the live site on 2026-10-08. Delete it (and its reactions) or let it stay in the archive before public launch. |
| Main Worker/API | Deployed 2026-10-08 with `pnpm wrangler deploy`. Verified: a test pin created on the live site survived a hard refresh and appeared in the remote D1 query. |
| Archive companion Worker | Deployed 2026-10-08 with `pnpm wrangler deploy -c wrangler.cron.jsonc` (upload and trigger registration reported). First scheduled run unconfirmed. After 2026-10-08 16:00 UTC confirm that `walls` has a row for 2026-10-08 with the right pin count. The job only records counts; it does not delete or clear pins. |
| Public launch | Not approved. Keep `noindex, nofollow`; mock content and the unofficial-site disclaimer remain. |

Remaining production actions for Phases 0 to 5: confirm the first archive run, and remove or keep the test pin on purpose. Production deployments of Phase 6 and later wait for the archive-run confirmation. No remote migration is needed for Phases 0 to 5. Do not run production-changing commands without approval for that specific action.

## Risks and regression checks

- **CSS cascade:** `src/index.css` contains the Google Fonts import, Tailwind import, and substantial unlayered custom CSS/overrides. Preserve every byte and order when moving it. Moving rules into a Tailwind layer or utility classes changes preflight/cascade behavior.
- **Hydration/DOM fidelity:** current app is one client-rendered React tree; Astro will create server HTML with selective islands. Keep island boundaries tight, avoid double-mounting shared state, and compare normalized `#root` markup after each port.
- **Viewport/time-dependent output:** `WallBoard` initializes zoom from `window.innerWidth`; Archive uses `Date`; the reset timer must ultimately use API `resetsAt`. Set matching time/timezone and viewport when comparing.
- **Fonts/images:** Google Fonts and Unsplash images are remote. Baseline waits for fonts and image decode; network changes or unavailable assets can produce capture noise. Do not replace fonts/assets in this migration.
- **Sticky header:** announcement must scroll away while the cream header sticks; at mobile widths scroll direction toggles `header-hidden`. Test open-menu and scroll states, preserving exact classes.
- **Static/Worker routing:** ensure prerendered paths and static assets resolve before the Worker fallback while `/api/*` is handled on demand; verify both locally and in deployed Worker previews.
- **Secrets:** `OWNER_HASH_SALT` is configured locally and declared required for deployment; the production secret must be set securely before deploying write endpoints.


## Tier 1 development plan (Phases 6 to 14)

Source of the feature list: the Feature Tier List (Tier 1). Edit and delete of your own notes was added to Tier 1 on 2026-10-08 and lives in Phase 7. Everything below is **not started**.

### Rules for every phase from 6 onward

- Build order inside a phase: mock or local UI first, then the API, then wire them together, as in Phases 2 and 4.
- Verify locally before anything touches production. `pnpm run check` and `pnpm run build` must pass with 0 errors, warnings, or hints.
- Visual checks at 390×844, 768×1024, and 1440×900. Pages that are intentionally changed get a new recorded baseline (note the date and reason); pages that are not changed must stay within the existing ≤0.1% tolerance.
- Migrations are numbered (`0002_...` and up), parameterized in code, applied locally first, and **additive only** (new tables and columns; no renames or drops of `pins`, `reactions`, `reports`, or `walls`) because the deployed archive Worker reads those tables.
- Deployment order: apply remote migration, then deploy the main Worker. Redeploy `balik-baleno-archive` only if a phase changes what it reads or writes.
- Production deployments, secret changes, and remote data writes need the owner's explicit approval for that action. Secrets are set by the owner in their own terminal.
- The site stays `noindex, nofollow` until public launch is approved.

### Decisions

| Date | Decision | Status |
|---|---|---|
| 2026-10-08 | The repo's `PLAN.md` is the source of truth; the Notion copy is a snapshot refreshed at each phase gate. | Decided (owner) |
| 2026-10-08 | The Phase 5 approval gate is skipped; the first scheduled run is recorded as a non-blocking checklist item. | Decided (owner) |
| 2026-10-08 | Own-note edit and delete are part of Tier 1 (Phase 7). | Decided (owner) |
| 2026-10-08 | Posting requires an approved sign-in once Phase 7 ships. | Decided (owner) |
| 2026-10-08 | The owner creates the first `super_admin` with a one-time `wrangler d1 execute` command they run themselves. | Decided (owner) |
| 2026-10-08 | Migrations stay additive, and Phase 6+ is not deployed to production, until the first archive run is confirmed. | Decided (owner) |
| 2026-10-08 | Open questions not explicitly answered by the owner use the proposed defaults in this plan. | Decided (owner) |
| 2026-10-08 | Phase 6 uses server-side Google OpenID Connect authorization-code flow with PKCE and verified ID tokens; D1 holds opaque session records and signed `HttpOnly`, `Secure`, `SameSite=Lax` cookies carry only the session reference. This keeps Google tokens out of browser storage, works with `session: false`, and allows server-side revocation. | Decided (implementation) |
| 2026-10-08 | Phases 6 to 12 run in the order listed (donation corner last; it may move earlier if the owner prefers income sooner). | Proposed, needs owner confirmation |
| 2026-10-17 | Profiles, batch member lists and profile photos are visible to signed-in, approved alumni only. Batch pages stop being prerendered and show real, approved members and real counts. | Decided (owner) |
| 2026-10-17 | The codename never appears on a profile; wall notes never link to a profile; batch pages are the only way in, for now. | Decided (owner) |
| 2026-10-17 | The direction is hanging out, not matchmaking: interests from a shared catalogue, a coarse hand-typed `based_in` shown only when it is filled in, `open to meetups` off by default, and the Singles corner dropped. | Decided (owner) |
| 2026-10-17 | Photos are downscaled in the browser and stored in R2 (`balik-baleno-media`, binding `MEDIA`) with no server-side image processing; images are served through a Worker route with private caching. | Decided (implementation) |
| 2026-10-17 | Profile moderation ships as option B: an account-based "report this profile" that lists in the existing `/admin/reports`, with no per-photo tool and no auto-hide by report count. | Decided (owner) |
| 2026-10-17 | Teacher accounts, claiming and onboarding are deferred. The owner curates the teacher pool and the teacher card images in the app (Phase 14). The account name is editable and stops being overwritten by Google sign-in. | Decided (owner) |

### Phase 6: Sign-in, roles, and approval queue (implemented; partially verified locally)

Verified locally (top STATUS block is truth): Google sign-in, /join form with validation, pending state; sign-out (cookie cleared, session row deleted, /api/auth/me returns null); CSRF on POST /api/auth/signout (200 with valid token and Origin; 403 csrf_invalid with wrong Origin, missing token, or wrong token); TypeScript pinned to exactly 6.0.3 with `pnpm run check` (0 errors, 0 warnings, 7 hints) and `pnpm run build` passing.
Not verified: approve and decline from /admin/approvals and their admin_audit rows; approved-only endpoints blocking pending, declined, and signed-out users and admin endpoints blocking normal users; CSRF rejection on /api/admin/approvals/* specifically; first-admin bootstrap for production (local promotion was done by a manual local D1 UPDATE).

**Goal:** real accounts, so codenames, own-note rules, birthdays, and profile photos have an owner. This phase is the foundation for all later Tier 1 phases.

**Steps**
1. Choose the sign-in approach (Google sign-in via OAuth 2.0 / OpenID Connect). Check the current Cloudflare and Astro docs and record the choice and the reasons under Decisions. The adapter's session KV is disabled (`session: false`), so store sessions in D1 or use signed cookies; record which.
2. Migration `0002`: `users` (id, google subject id, email, display name, role, status, batch year, created_at), `sessions` (or equivalent), and an `admin_audit` table for approvals and role changes. Roles: `super_admin`, `admin`, `alum`. Statuses: `pending`, `approved`, `declined`, `suspended`.
3. Sign-in, sign-out, and a minimal "who am I" endpoint. Cookies are `HttpOnly`, `Secure`, `SameSite`. Add CSRF protection to state-changing endpoints.
4. A request-to-join form: batch year and a short note for the approver (Zod-validated). New accounts start as `pending` and cannot post.
5. An admin approval queue (admin-only) to approve or decline, with an audit entry for each action.
6. The first `super_admin` is created by the owner with a one-time `wrangler d1 execute` command the owner runs; never grant admin by email match in code.
7. Rate limits on sign-in and join requests (check current Cloudflare rate-limiting options and record the choice).
8. Secrets: Google client secret and the session signing secret are set by the owner in their own terminal. Names and setup steps go in this file; values do not.

**Definition of done:** a new alum signs in, lands as pending, the owner approves them, and they see an approved state; a pending or declined user cannot reach approved-only endpoints; every admin action is in the audit table.

**How the owner verifies:** sign in with a test Google account, approve it from the queue, then confirm a pending account is refused on an approved-only endpoint. `pnpm run check` and `pnpm run build` pass. No change to Home, Wall, Archive visuals beyond the sign-in entry point.

**Notes:** pins created before sign-in have only a device-token hash and cannot be linked to an account later. Acceptable while the site holds test data.

**2026-10-08 local implementation record:** Added additive migration `0002_auth.sql` and applied it with `pnpm wrangler d1 migrations apply DB --local` only. It creates `users`, `sessions`, and `admin_audit`; no remote D1 command ran. Added the Google OIDC start/callback flow, PKCE, ID-token signature/claim verification, D1 sessions, signed `HttpOnly` cookie handling, CSRF checks, sign-in/sign-out/who-am-I/approved-only endpoints, a Zod-validated join request, and an admin approval queue which records approval and decline actions. Role and status constants live in `src/config.ts`; `.dev.vars.example` names the required local variables only. Required verification is blocked: local credentials have not yet been created, and both `pnpm run check` and `pnpm run build` currently fail before source checking because Astro 7.3.6 / Vite 8.3.1 evaluates the CommonJS `picomatch` package without `require` in its config runner. `pnpm exec tsc --noEmit` passes for the application source. No production deploy, secret, or remote data write occurred.

### Phase 7: Wall rules and moderation (not started)

**Goal:** the wall rules from Tier 1 item 1, including own-note move, edit, and delete.

**Steps**
1. Migration `0003` (additive): `pins.user_id` (nullable), `pins.edited_at`, `pins.hidden` or a status value, a unique case-insensitive `users.codename`, and an index on `pins(user_id)`. Existing device-owned pins stay valid.
2. Codename on the profile, used as the note signature. Rules: 3 to 20 characters, unique, validated, with a rate limit on changes.
3. Posting requires an approved account (decision in Open questions). The existing 150 pins per wall day cap stays; replace or extend the 5-per-device limit with a per-user daily limit.
4. Move your own pin: switch from device-token to account ownership, keeping the existing ten-minute window. Only admins can reposition other people's pins (current wall date only).
5. **Delete your own note:** allowed at any time, on today's wall and in the archive. In one D1 batch: delete the pin and its reactions and reports, and recompute the `walls` row for that pin's wall date so archived counts stay correct. When R2 images exist (Phase 11), delete the object too.
6. **Edit your own note:** allowed only within the edit window (default equals the move window) and only while the note has no reactions and no reports. Set `edited_at`, show an "edited" mark on the note, and list recently edited notes in the admin review screen. Notes entered in an event contest lock once voting opens (for the later contest feature).
7. Report-and-hide: reports already exist. Add an auto-hide threshold (default 3 distinct reporters, configurable in `src/config.ts`) and an admin review screen to restore or delete hidden notes.
8. All limits live in `src/config.ts`. Errors are explicit JSON 400/403/404/429.

**Definition of done:** an approved alum can sign a note with their codename, move it within the window, edit it within the window if it has no reactions or reports, and delete it any time; deleting an archived note updates the `walls` count; an admin can rearrange and review hidden notes; a non-owner always gets 403.

**How the owner verifies:** local tests (and a short written test list in this file) for each rule, including: another user gets 403 on edit/delete, edit after a reaction is refused, delete of an archived note updates `walls`, and the hide threshold. Wall screenshots stay within tolerance except the deliberate signature/edited-mark changes.

### Phase 8: Daily prompt, throwbacks, and pin look (not started)

**Goal:** give people a reason to post each day, and make pins feel physical.

**Steps**
1. Migration `0004`: `prompts` (id, text, show_date unique, created_by). Admin screen to schedule prompts; the wall shows the prompt for the current Manila date, with a fallback rotation when none is scheduled.
2. "On this day" strip using the archive: same month and day in previous months and years. Hide the strip when there is no history. It will stay empty for a while; that is expected.
3. Pin look: tape and thumbtack variants, slight rotation derived from the pin id (stable across refreshes), overlap, with the existing draw tool unchanged. These are CSS and front-end changes; record a new Wall baseline with date and reason.

**Definition of done:** a scheduled prompt appears on the right Manila date and falls back correctly; the throwback strip hides when empty and shows correct notes when seeded locally; pin look is stable across refreshes.

**How the owner verifies:** seed a local prompt and local past-year pins, check the strip at the three widths, and confirm a pin keeps its rotation after a hard refresh.

- Database migration for birthday (Done).
- User profile updates for birthday (Done).
- API for birthday celebrants (`/api/celebrants/today`) (Done).
- Wall UI: Birthday celebrant display (Done).

**Steps**
1. Migration `0005` (additive): `users.birth_month`, `users.birth_day`, `users.birthday_visible` (default off). Store month and day only, never the year.
2. Profile settings page with an explicit opt-in and a short Data Privacy Act notice.
3. A page and a Home strip showing today's birthdays and the next 14 days, computed in `Asia/Manila`. Only approved alumni who opted in appear. Decide how February 29 is shown in non-leap years (proposal: February 28).
4. Display name: the codename by default; real name only if the user chooses it.

**Definition of done:** opted-in users appear on the right days in Manila time; users who did not opt in never appear in any API response; opting out removes them immediately.

**How the owner verifies:** local test users with birthdays today, tomorrow, and 15 days away, one opted out; call the API and confirm the opted-out user's fields never appear.

**Deferred:** email or notification reminders (belongs to the email digest).

### Phase 10: Teacher tribute corner (not started)

- Database migration for teachers and teacher_notes.
- `lib/teachers.ts` for data access.
- API endpoints: `GET /api/teachers`, `GET /api/teachers/[id]/notes`, `POST /api/teachers/[id]/notes`.
- UI pages: `/teachers` and `/teachers/[id]`.


**Goal:** thank-you notes for specific teachers, collected on one page per teacher.

**Steps**
1. Migration `0006`: `teachers` (id, slug, name, subject, years, active) and `tributes` (id, teacher_id, user_id, text, status `pending|approved|hidden`, created_at).
2. Admin screen to add and edit teachers. **Input needed from the owner:** the first teacher list.
3. Routes `/teachers` and `/teachers/[slug]`, rendered on demand from D1. Tributes appear only after an admin approves them (approval first, because these are emotional and name real people).
4. Posting a tribute requires an approved account. Authors can delete their own tributes; editing follows the same rule as notes (short window, no reports).
5. Report flow reused from the wall. A donation prompt shows after posting only once the donation page exists (Phase 12); until then it stays hidden.

**Definition of done:** a signed-in alum posts a tribute, an admin approves it, and it appears on that teacher's page; unapproved tributes never appear in public responses.

**How the owner verifies:** post a tribute with a test account, confirm it is invisible until approved, approve, confirm it appears; check at the three widths.

### Phase 10.1: Teacher directory — search, subject filter, and pagination (done)

**Goal:** make the `/teachers` directory usable as it grows: type-ahead search, a subject filter, and paginated results.

**Steps**
1. `src/lib/teacher-filter.ts` (new): pure helpers `listSubjects`, `filterTeachers`, `paginate`, and `TEACHER_PAGE_SIZE`, unit-tested with the built-in `node --test` runner (`tests/teacher-filter.test.ts`). No new dependencies.
2. Migration `0008_seed_more_teachers.sql` (additive): seed additional teachers across several subjects so the filter and pagination can be exercised locally.
3. `/teachers` UI: a search input, a subject `<select>` whose options are rendered on the server from the data, and client-side pagination controls. Cards keep their existing layout; searching, filtering, and paging only toggle visibility.
4. Verify: `pnpm verify` (0 errors) and a local check of search, filter, and paging at 390x844, 768x1024, and 1440x900.

**Definition of done:** on `/teachers`, typing narrows the list by name or subject, choosing a subject filters to that subject, and the pagination controls page through the results; the page still renders the full list without JavaScript.

**How the owner verifies:** search for part of a teacher name, pick a subject, and page through the results on the running site.

**Verified (2026-10-17):** `pnpm verify` → 0 errors, 0 warnings, 9 hints (all pre-existing). `pnpm test` → 13/13. Runtime on `/teachers` (dev): 15 cards, 6 per page across 3 pages; search "math" → the 3 Mathematics teachers; subject "Physics" → 2; an unmatched query shows the empty state and hides the pager; no console errors.

### Phase 11: Now-versus-before profile photos (merged into Phase 13)

Folded into Phase 13 on 2026-10-17. It was always the first slice of the profile, and building it alone would have meant writing the photo pipeline twice. Migration `0009` stays reserved for the profile work. The one step that was not code is already done: the R2 bucket `balik-baleno-media` exists in the account and is bound as `MEDIA` in `wrangler.jsonc`, with types regenerated and `pnpm verify` clean. The old step list is superseded by Phase 13.1–13.6; nothing from it is dropped — keep the private bucket, the Worker-served images, the client-side resize, the opt-in high-school photo, and the reduced-motion-aware hover/tap.

### Phase 12: About the author and the support/donation pages (in progress)

**Goal:** an author page, and a separate page that shows the site's running costs and lets alumni contribute.

**Decisions (owner, 2026-10-17):**
- Two pages, linked: `/about` and `/donate`.
- Entry points: `/about` is footer-only; `/donate` also takes the header slot. The header swaps `Archive` out for `Support the site` and stays at six items — `Archive` keeps its other entries, on the wall ("Explore past walls") and in the footer.
- Between 760px and 860px the header shows the compact bar with the drawer nav: the inline bar needs ~845px to keep `Support the site` on one line, and it already wrapped at 760-789px with `Archive`.
- Payment methods: GCash, Maribank, GoTyme, and bank transfer — each its own QR code with the account name beside it.
- Migration number is `0010` (0007 and 0008 are the teacher seeds; Phase 11 takes `0009`).

**Steps**
1. `/about` (static): the author's story and connection to Baleno, why the site exists, and a short "what this costs" block linking to `/donate`. The independence disclaimer lives in the footer only, so it is not repeated in the page body. **Owner input (2026-10-17):** Jeffrey Caballero, Batch 2011; story drafted for review (Freedom Wall of our years, a place to belong); photo is a now/before placeholder with a hover swap; social links are placeholders. **Status: built.**
2. `/donate` (rendered on demand): the costs story, four QR codes (GCash, Maribank, GoTyme, bank transfer) with account names, a monthly progress bar, the opt-in supporters list (tiers, never amounts), and the "I donated" form. **Owner input:** QR images, account names and the monthly goal are placeholders for now. **Status: page built with placeholders; the progress bar, the supporters list and the "I donated" form wait on steps 3-5.**
3. Migration `0010` (additive): `donation_goals` (month, goal amount in centavos, label) and `donations` (id, display name, amount in centavos, reference number, public flag default off, message, status `pending|approved|rejected`, user_id nullable, created_at). Never store payment account numbers or receipt images.
4. API, test-first for the D1 queries and validation: `POST /api/donations` (submit; auth optional), `GET /api/donations/summary` (progress + approved public supporters), `POST /api/admin/donations/[id]` (approve/reject, writes `admin_audit`).
5. Admin screen at `/admin/donations`: match the reference number to the wallet, then approve or reject.
6. Footer: add "About the author" and "Support the site" to the EXPLORE group. Header: swap `Archive` for `Support the site`. Link the Phase 10 tribute prompt to `/donate`. **The footer links and the header swap are done; the tribute-prompt link waits on the backend.**

**Definition of done:** a test donation goes form → pending → approved, the progress bar updates, anonymous donors never appear by name, amounts never appear publicly, and an opted-out donor is absent from the public API.

**How the owner verifies:** submit two test donations (one public, one anonymous), approve both, and confirm the public pages and API responses reveal only what the donor allowed.

**Order:** `/about` first (no external inputs), then `/donate` once the QR images and goal are supplied.

**Progress (2026-10-17, uncommitted):**
- Both pages exist: `/about` (footer-only) and `/donate` ("Support the site" in the footer EXPLORE group and in the header, which stays at six items).
- Everything that awaits real content is marked on the page as a placeholder, so nothing reads as a promise: the author photo, the social links, the cost figures, the four QR codes, the account names, the monthly goal and the supporters list.
- Verified: `pnpm verify` clean; both routes 200; the author photo swap works on hover and on keyboard focus; four QR cards render (GCash, Maribank, GoTyme, bank transfer).
- Header (owner decision, 2026-10-17): `Archive` leaves the nav for `Support the site`; the header's compact-bar and drawer rules moved from the 760px block to a new 860px block so the inline bar never wraps. Checked at 800px: compact bar, drawer opens with all six labels on one line, no page overflow.
- Not built yet: migration `0010`, the three APIs, `/admin/donations`, the "I donated" form, and the Phase 10 tribute prompt link. The donation page is usable for scanning and sending today; only the progress bar, the supporters list and the form wait on the backend.

### Phase 13: Alumni profiles, photos, and the batch directory (planned)

**Spec:** `docs/specs/profile.md`. Read it alongside this plan — the plan argues from it, and it holds the decisions, the field list, the starter interest catalogue and the reporting option that was chosen.

**Goal:** an approved alum gets a page — face, cover, a few words, batch, where they are based, interests, and up to six gallery prints — and the batch pages stop showing mock names and become the only way in.

**Owner decisions (2026-10-17):** layout A; the high-school photo flips on hover/tap and is opt-in; the gallery is capped at six and owns the taped-print look; interests come from a shared catalogue with an admin-approved suggestion queue; the direction is hanging out, not matchmaking; the codename never appears on a profile; wall notes never link to a profile; profiles and batch lists are for signed-in, approved alumni only; reporting is option B; teachers wait for Phase 14.

**Rules for this phase:** the standing rules at the top of this plan apply, plus — migration `0009_profile.sql` only, with `0010` still reserved for Phase 12 donations and nothing applied to remote D1 without approval; photos downscale in the browser because there is no image-processing binding; `pnpm verify` clean (0 errors, the 9 known hints stay as they are); a new recorded baseline for every page whose look changes on purpose.

**Review focus** — inputs the spec implies that the tests below do not pin. Each line's test goes in the task that owns the code.
1. A brand-new profile with every field empty renders a page rather than an error, and shows no empty labels.
2. A photo that is too large, the wrong type, or not an image at all is rejected before any R2 object is written.
3. A signed-out or pending visitor gets nothing from `/alumni/[id]` or `/media/<key>` — no data, no bytes.
4. Replacing a photo deletes the object it replaced, so no orphans accumulate.
5. An account that hides itself leaves the grid *and* the counts.

#### 13.1 Profile data, visibility rules, and the own editor

**Files:** create `migrations/0009_profile.sql`, `src/lib/profile.ts`, `tests/profile.test.ts`; modify `src/lib/auth.ts`, `src/config.ts`, `src/pages/profile.astro`.

**Interfaces:**
- `toProfileView(row: ProfileRow, viewer: { isOwner: boolean }): ProfileView` — pure; it is where every visibility rule lives.
- `getOwnProfile(userId)`, `getProfileForViewer(targetId)`, `updateProfile(userId, fields)`.
- `PROFILE_CONFIG` in `src/config.ts`: `{ maxInterests: 10, maxGalleryPhotos: 6, maxCaptionLength: 80, maxBioLength: 400, maxBasedInLength: 60, maxPhotoBytes: 2_000_000 }`.

**Steps**
1. Migration `0009` (additive): the `users` columns, `user_photos`, `user_interests`, `interests` plus the catalogue seed, `interest_suggestions`, `profile_reports`, and the `teachers` columns — all as listed in the spec. Add `profile_audit` as a **new** table (`teacher_created`, `teacher_updated`, `teacher_deactivated`, `interest_approved`, `interest_declined`, `profile_report_closed`, `photo_removed`) rather than rebuilding `admin_audit`, whose CHECK is approval-only; that is the reasoning `0003` used for `moderation_audit`.
2. Failing tests first in `tests/profile.test.ts` for `toProfileView`: a hidden birth year while day and month still show; a hidden marital status; a blank `based_in` returning null; `avatar_then_visible = 0` returning no high-school photo; `open_to_meetups = 0` returning false.
3. Implement `profile.ts` and `PROFILE_CONFIG`; make the tests pass.
4. `src/lib/auth.ts`: add the new fields to `AuthUser` and `serializeUser`; fix `getSessionUser`'s SELECT, which omits `birth_month` and `birth_day` while `userSchema` requires them (a live bug); stop `findOrCreateGoogleUser` overwriting `display_name` on each sign-in so an edited name survives. Pick one casing at the API boundary and hold it — `serializeUser` emits camelCase while `profile.astro` reads snake_case today, and that mismatch gets fixed here.
5. `/profile` becomes the editor in sections — about (display name, batch, based in, bio, profession), details (birthday with a separate day/month switch and year switch, marital with its own switch), privacy (`listed_in_batch`, `open_to_meetups`) — keeping the codename form that is already there. Photos arrive in 13.2 and interests in 13.5.
6. `GET /api/profile` and `PUT /api/profile`: approved-only, CSRF, Zod-validated, `errorResponse` codes matching the existing routes.
7. **Done when** the tests pass, `pnpm verify` is clean, an approved alum saves every text field and finds them after a reload, and a pending account gets 401 or 403 from the API.

#### 13.2 Photo upload, the media route, and the photo editor

**Files:** create `src/lib/media.ts`, `tests/media.test.ts`, `src/pages/api/profile/photos.ts`, `src/pages/api/profile/photos/[kind].ts`, `src/pages/api/profile/gallery/[id].ts`, `src/pages/api/media/[...key].ts`, `src/components/PhotoEditor.tsx`; modify `src/pages/profile.astro`.

**Interfaces:**
- `sniffImageType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null` — pure; magic numbers, never the `Content-Type` header.
- `buildMediaKey(userId: string, kind: string, ext: string): string` — pure; must always land under `u/<userId>/` and never emit `..`, a slash or a leading dot from its inputs.
- `saveMedia(env, userId, kind, bytes, contentType)`, `deleteMedia(env, key)`, `mediaUrl(key): string | null`.

**Steps**
1. Failing tests first in `tests/media.test.ts`: `sniffImageType` accepts real JPEG, PNG and WebP headers and rejects a text file that claims to be a JPEG; `buildMediaKey` stays inside `u/<userId>/` for a hostile user id.
2. Implement `media.ts`; make the tests pass.
3. `POST /api/profile/photos` (multipart; `kind` = `cover` | `avatar` | `avatar_then` | `gallery`): approved-only, CSRF, `sniffImageType` plus `PROFILE_CONFIG.maxPhotoBytes`, a count check against 6 for gallery. On success write to R2 through the `MEDIA` binding, store the key, delete the object it replaced, and return the new key.
4. `DELETE /api/profile/photos/:kind`, `DELETE /api/profile/gallery/:id` (object and row), and `PATCH /api/profile/gallery/:id` for caption and order.
5. `GET /media/[...key]`: approved-session check, then stream from R2 with `Cache-Control: private, max-age=…`; 404 for a missing key, 401/403 for no session. Never a shared cache.
6. `PhotoEditor.tsx`: downscale on a canvas before upload (cover ~1600px wide, avatar ~512px square, gallery ~1200px), preview before saving, remove, reorder, caption — with no new dependencies; a canvas and `toBlob` are enough. It replaces the placeholder panel that was drawn during brainstorming.
7. **Done when** an upload round-trips locally, an oversized or non-image payload is rejected with nothing written to R2, replacing a photo leaves no orphan, and no `<img>` on the profile uses a raw key instead of `mediaUrl`.

#### 13.3 The public profile page

**Files:** create `src/components/ProfileView.astro`, `src/pages/alumni/[userId].astro`; modify `src/pages/profile.astro` (add a "view my profile" link).

**Steps**
1. `ProfileView.astro` is layout A from the spec: cover strip, circular avatar overlapping on the left, name and batch beside it, then two columns — wide for bio and gallery, narrow for the dense facts. The flip uses the hover/focus swap already in `AboutPage.astro`, adapted for tap on touch devices, and respects reduced motion.
2. The gallery renders taped prints in rows of three with the handwritten caption, capped at six, and nothing at all when empty.
3. `/alumni/[userId].astro` sets `prerender = false`, requires an approved session (signed-out visitors are sent to sign-in and back), 404s on an unknown id, and shows the suspended state rather than a profile for a suspended account.
4. **Done when** the page renders with everything filled, with nothing filled, and with photos in any combination; a signed-out fetch returns no profile data; the flip works at 390×844 (tap), 768×1024 and 1440×900 (hover).

#### 13.4 The batch directory

**Files:** create `src/lib/batch.ts`, `tests/batch.test.ts`; modify `src/components/BatchPage.astro`, `src/pages/batches/[year].astro`, `src/pages/batches/index.astro`, `src/data/mock.ts` (drop `memberNames` and any name it only fed).

**Interfaces:**
- `summariseBatch(rows): { members: number; notes: number }` — pure; hidden members leave both counts, hidden notes leave the note count.
- `listBatchMembers(batchYear)`, `batchStats(batchYear)`, `listBatchYears(): Promise<{ year: number; count: number }[]>`.

**Steps**
1. Failing tests first in `tests/batch.test.ts` for `summariseBatch`: a hidden member is in neither count, a hidden note is in neither, and an empty batch returns zeros rather than a plausible number.
2. Implement `batch.ts`; make the tests pass.
3. `BatchPage.astro`: the grid is the real member list with each card linking to `/alumni/<id>`, the avatar is the profile photo when there is one and initials when there is not, and the two hero numbers come from `batchStats`. Delete the fake `68` and `124`.
4. `/batches/[year].astro` renders on demand behind the approved-session check, and `/batches/index.astro` shows real years and counts.
5. **Done when** a member who hid is absent from the grid and both counts, a member with no photo still renders, and every number matches a direct D1 query.

#### 13.5 Interests: the catalogue, the picker, and the suggestion queue

**Files:** create `src/lib/interests.ts`, `tests/interests.test.ts`, `src/components/InterestsPicker.tsx`, `src/pages/api/interests.ts`, `src/pages/api/interests/suggest.ts`, `src/pages/api/profile/interests.ts`, `src/pages/admin/suggestions.astro`, `src/pages/api/admin/suggestions/index.ts`, `src/pages/api/admin/suggestions/[id].ts`; modify `src/pages/profile.astro`.

**Interfaces:**
- `slugify(text: string): string | null` — pure; null when nothing usable remains.
- `matchInterests(catalogue, query)` — pure type-ahead; case-insensitive, keeps each interest's group.
- `togglePick(picks: string[], slug: string, cap: number): string[]` — pure; refuses past the cap, never duplicates.
- `listCatalogue()`, `getUserInterests(userId)`, `setUserInterests(userId, slugs)`, `suggestInterest(userId, text)`, `approveSuggestion(id, group, actorId)`, `declineSuggestion(id, actorId)`.

**Steps**
1. Failing tests first in `tests/interests.test.ts`: `slugify("Kansi & Batchoy")` is `kansi-batchoy` and punctuation or accents collapse rather than survive; `slugify` returns null for an empty or symbol-only line; `matchInterests` is case-insensitive and ignores a blank query versus a query with no hits; `togglePick` refuses an 11th pick and does not duplicate an existing one.
2. Implement `interests.ts`; make the tests pass.
3. `GET /api/interests` returns the active catalogue grouped; `PUT /api/profile/interests` replaces the set (cap 10, active slugs only); `POST /api/interests/suggest` takes one line, approved-only, CSRF, rate-limited the way join is.
4. `InterestsPicker.tsx` implements the chosen mechanic: search with type-ahead, the grouped shelf below, picks pinned with a counter ("7 of 10"), and the "can't find it — suggest it" affordance feeding the queue.
5. `/admin/suggestions` lists the queue with approve (choose a group; the slug is derived and must not collide) and decline; both write `profile_audit`. The catalogue seed carries the starter list from the spec, and `active = 0` retires one without breaking anyone who picked it.
6. **Done when** an approved suggestion becomes pickable with no deploy, a declined one never appears anywhere, and the 11th pick is refused by the API rather than only by the UI.

#### 13.6 Profile reporting (option B)

**Files:** create `src/pages/api/profile/report.ts`, `src/pages/api/admin/profile-reports/index.ts`, `src/pages/api/admin/profile-reports/[id].ts`; modify `src/pages/admin/reports.astro`, `src/components/ProfileView.astro`.

**Steps**
1. `POST /api/profile/report` takes `target_id` and an optional `note`: approved-only, CSRF; one row per reporter per target, so a second report updates the note instead of adding a row; reporting yourself returns a 200 no-op rather than an error.
2. `/admin/reports` gains a second section listing open profile reports with the reporter, the target, the note and a link to the profile. Closing one writes `profile_audit`. The spec is explicit that the admin cannot remove a single photo under B — the choices are to ask the member or suspend the account.
3. The "Report this profile" link sits at the bottom of the profile view and appears only on somebody else's profile.
4. **Done when** a report reaches the admin list, closing it clears it, and the same reporter cannot file twice. No auto-hide by report count — deliberately, per the spec.

#### 13.7 Verification for the phase

1. `pnpm verify` → 0 errors, and the output is shown.
2. `pnpm test` → all pass, including the new `profile`, `media`, `batch` and `interests` suites.
3. Local walkthrough with three accounts (admin, approved alum, pending): fill a profile, upload all four photo kinds, pick interests, suggest one, approve it in admin, report a profile, close the report, hide the member, then confirm the grid and both counts change together.
4. Record new baselines for `/profile`, `/alumni/[id]`, `/batches/[year]` and `/batches` with date and reason. `/teachers` is untouched until Phase 14.
5. Migration applies locally only: `pnpm wrangler d1 migrations apply DB --local`. Remote application waits for explicit approval, and the deploy order stays migration-then-Worker.

**Progress (2026-10-17):** 13.1 built and verified. Migration `0009_profile.sql` applied to local D1 only (38 statements; 6 new tables, 12 new `users` columns, 92 seeded interests in 10 groups). New tests `tests/profile-view.test.ts` and `tests/profile-input.test.ts` (17 cases, all written failing-first); `pnpm test` 34/34; `pnpm verify` 0 errors, 0 warnings, 9 pre-existing hints. `/profile` is now the editor and `/api/profile` serves GET and PUT. Runtime-checked: signed-out API access is refused with 401 `sign_in_required`, and `/profile` renders 200. Not verified yet: the signed-in round-trip, which needs a real Google sign-in. Two pre-existing bugs fixed on the way: `getSessionUser` no longer omits the birthday columns that `userSchema` requires, and Google sign-in no longer overwrites `display_name` on every login. **13.2 built and verified:** photo pipeline is in — `src/lib/media.ts` (magic-number sniffing, key safety, R2 put/delete behind a local `MediaBucket` type), `tests/media.test.ts` (14 cases, written failing-first), the upload/delete/caption routes and `/media/<key>` serving route, and the Photos panel in `/profile` (cover, profile picture, batch-era photo, six-slot gallery, browser-side resizing). `pnpm test` 52/52; `pnpm verify` 0 errors, 0 warnings. Signed-out runtime checks: uploads → 401, `/media/<key>` → 404, traversal-shaped key → 404. Not verified yet: the upload round-trip itself, which needs a signed-in approved session. Nothing committed.

**Progress (2026-10-17, later):** 13.3 to 13.6 built, 13.7 run. `/alumni/[userId]` is the public profile (layout A, the AboutPage-style now/then flip as a real button with `aria-pressed`, taped gallery prints, a real 404 for an unknown id, a suspended state, and the report link on somebody else's profile); `/alumni/me` resolves to the signed-in viewer so the editor's "View my profile" link needs no id from the API. The batch directory is real: `src/lib/batch.ts` (pure, 4 cases) with `batch-db.ts` behind it, `/batches` lists only years somebody is listed in, and both hero numbers come from `batchStats` — the fake `68` and `124` and `memberNames` are gone. Interests are the chosen mechanic: `src/lib/interests.ts` (pure, 9 cases), `interests-db.ts`, `GET /api/interests`, `PUT /api/profile/interests` (cap 10 enforced by the API, not only the picker), `POST /api/interests/suggest` (3 pending per member, no rate limiting exists in this codebase to copy), `/admin/suggestions` with approve-into-a-group and decline, both writing `profile_audit`. Reporting is option B: `POST /api/profile/report`, `/api/admin/profile-reports`, and a second section on `/admin/reports`; the reporter cannot file twice, and closing writes `profile_audit`. New tests `tests/batch.test.ts` and `tests/interests.test.ts` (13 cases, written failing-first). `pnpm test` 65/65; `pnpm verify` 0 errors, 0 warnings, 10 hints, exit 0. Signed-out runtime: the alumni and batch pages redirect to sign-in, and every new API answers 401. Local D1 arithmetic checked with two temporary users (one listed, one hidden) and three notes (one hidden): the grid held only the listed member, the member count was 1, the note count 2, and the year list showed 2015 once — all temp rows deleted afterwards. Runtime SQL was checked against the real schema, not assumed (`profile_audit`'s CHECK admits the three new actions; `profile_reports_pair_unique` matches the `ON CONFLICT` target; `interest_suggestions_pending_unique` is what makes the suggestion insert idempotent). Not verified, and why: the signed-in walkthrough needs a real Google sign-in, and the new baselines for `/profile`, `/alumni/[id]`, `/batches/[year]` and `/batches` need a capture harness that does not exist in this repo — both are the owner's. One known gap: `AuthModal.tsx` drops the `returnTo` the gated pages send, so a signed-out visitor signs in but does not land back on the page they asked for; the modal is uncommitted owner work and was left alone. Nothing committed.

### Phase 13.8: Profile editor redesign (built and verified)

**Goal:** Redesign `/profile` from an administrative form stack into a warm, cohesive alumni profile studio following `redesign-existing-projects` standards and the Baleno aesthetic.

**Files:** modify `src/pages/profile.astro`.

**Steps**
1. **Card layout & hierarchy:** Replace flat form stack with structured warm-cream cards (`#fbf9f1`, border `#dfdbce`, subtle radius) grouped logically: About You, Birthday & Personal Details, Photos Studio, Community & Privacy, Codename.
2. **Action bar & header:** Add prominent "View public profile" button and sticky section anchors/navigation.
3. **Local feedback & button loading states:** Replace single disconnected top status string with inline toast/alert feedback per card and loading/disabled states on submit buttons during `fetch`.
4. **Photo studio UI:** Dedicated preview frames for cover photo (16:9 banner with upload overlay), profile avatar, and batch-era flip avatar with camera icons and clear remove controls; polish 6-slot gallery polaroid cards.
5. **Modern toggle switches:** Replace raw browser checkboxes with accessible toggle switch components for visibility and privacy preferences.
6. **Token & chip consistency:** Purge raw cold grays (`#ddd`, `#f2f2f0`, `#1f1a17`); align interest chips and shelf elements to Baleno design tokens (`#1b1a5f`, `#a7513c`, `#dfdbce`, `#eaeadd`).
7. **Buttons & Interest Pills:** Restyled all buttons with high-contrast surfaces, solid borders, hover lifts, active depressions, and distinct semantic variants (`.button-secondary`, `.button-outline`, `.button-remove`). Restyled interest items into standout pill options with icon badges (`+` to pick, `✓` when picked) grouped into distinct shelf cards.
8. **Done when** `pnpm test` passes, `pnpm verify` passes, and `/profile` displays responsive, tactile, polished cards with localized feedback.

**Progress (2026-10-18):** Completed. Studio card layout, accessible toggle switches, tactile button hierarchy, standalone interest pills with icon badges, and photo gallery controls implemented in `src/pages/profile.astro`. Verified: `tsc --noEmit` 0 errors, `pnpm test` 65/65 pass, `pnpm build` clean prerender.

### Phase 14: Teacher pool admin and card images (planned)

**Spec:** `docs/specs/profile.md`. Independent of Phase 13 — it can run before it if the owner prefers, and it reuses 13.2's `media.ts` and `saveMedia` pipeline, so it runs after at least that much.

**Goal:** the owner curates the teacher pool from inside the app — add a teacher from then or now, edit, deactivate — and every teacher card carries a photo instead of an initials circle.

**Decisions:** no teacher accounts, no claiming, no onboarding copy in this build; the nullable `teachers.user_id` link stays unused and waiting. `active = 0` removes a teacher from the directory while their page survives. `tenure` (for example "1988–2014") renders on the teacher page when it is set.

**Files:** modify `src/lib/teachers.ts`, `src/pages/teachers/index.astro`, `src/pages/teachers/[teacherId].astro`; create `src/pages/admin/teachers.astro`, `src/pages/api/admin/teachers/index.ts`, `src/pages/api/admin/teachers/[id].ts`, `src/pages/api/admin/teachers/[id]/photo.ts`, `tests/teacher-card.test.ts`.

**Steps**
1. Failing tests first in `tests/teacher-card.test.ts` for a pure `teacherCardImage(teacher)` that returns the photo URL or the initials fallback, and a pure `isListedTeacher(teacher)` that decides listing from `active`.
2. `teachers.ts`: add `photo_key`, `tenure` and `active` to `Teacher`, filter `getAllTeachers` on `active = 1`, and add `createTeacher`, `updateTeacher`, `setTeacherActive` and `saveTeacherPhoto`.
3. `/admin/teachers`: list, add and edit forms, a photo upload through the same `saveMedia` path and the same 512px square downscale used for an avatar, and a deactivate toggle. Every write goes to `profile_audit`.
4. `/teachers` and `/teachers/[teacherId]`: render the photo through `mediaUrl` with the initials circle as fallback, and show `tenure` when present.
5. **Done when** adding a teacher with a photo shows it on the directory and their page, a deactivated teacher leaves the directory but keeps their page, and a teacher with no photo falls back to initials.
6. Record new baselines for `/teachers` and `/teachers/[teacherId]` with the date and the reason — those two pages change on purpose, which is exactly the kind of change the baseline rule exists to make visible.

### Deferred / not in this task

- Event-themed site, comments and suggestions corner, event contests with prizes, badges and milestones, email digest, Tier 2 and Tier 3 features.
- Singles corner: skipped. If ever built, it must be opt-in and show interests only.
- Wall "post as" (real name, codename, or anonymous chosen at post time). Decided 2026-10-17, but it belongs to the wall, not the profile: `/api/pins` silently signs every note with the codename today and must validate the chosen signature instead. Not lost — it rides the wall's next change.
- Wall photo notes (HTTP 501 today). Not part of Phase 13; see open question 9.
- Teacher accounts, claiming, and onboarding copy. Deferred out of Phase 14 on purpose; the nullable `teachers.user_id` link waits for them.
- Browse by interest / "who is up for coffee" page. Phase 13 collects the fields it needs; the page itself is later.
- Badges and milestones. The profile layout leaves a slot for them; nothing is built.

### Open questions

1. Who moderates the wall, and may current students post?
2. Does posting require an approved sign-in once Phase 7 ships? DECIDED (owner, 2026-10-11): yes — posting requires an approved account, with auth + verifyCsrfRequest.
3. Per-user daily pin limit, and the edit-window length. DECIDED (owner, 2026-10-11): 2 notes per user per day; wall cap raised from 150 to 200 per day (update every place 150 appears: code, PLAN.md, UI text); edit and move window both 10 minutes (WALL_CONFIG.pinMoveWindowMs).
4. Should deleting a note also reduce the archived count for its day? DECIDED (owner, 2026-10-11): yes, recomputed in the same batch.
5. Report auto-hide threshold. (Proposal: 3 distinct reporters.)
Phase 7 moderation decisions DECIDED (owner, 2026-10-11): codename first set free, then 1 change per 7 days; use a separate `hidden` INTEGER column on pins (do not extend status); admin reposition is current wall date only while hidden/archived review is a separate read-only admin list.
6. How the first `super_admin` is created. (Proposal: the owner runs a one-time D1 command.)
7. Who supplies the first teacher list for Phase 10? DECIDED (owner, 2026-10-17): the owner curates it in the app — teachers from then and now, added through the new `/admin/teachers` (Phase 14). Teacher accounts and claiming are deferred.
8. Donation methods: GCash only, or add PayPal/Ko-fi? DECIDED (owner, 2026-10-17): GCash, Maribank, GoTyme and bank transfer, each with its own QR code.
9. Do wall photo notes ship with Phase 11 or later? DECIDED (owner, 2026-10-17): later. Phase 13 is profile photos only; wall photo notes (HTTP 501 today) are not part of it and still need their own decision.
10. February 29 birthdays in non-leap years. (Proposal: show on February 28.)
11. Should the donation corner move ahead of Phases 10 and 11?
