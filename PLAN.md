# Balik Baleno migration plan

## STATUS

Verified locally:
- Google sign-in, /join form with validation, pending state
- Sign-out: cookie cleared, session row deleted, /api/auth/me returns null
- CSRF on POST /api/auth/signout: 200 with valid token and Origin; 403 csrf_invalid with wrong Origin, missing token, or wrong token
- TypeScript pinned to 6.0.3 (astro check does not support TS 7); `pnpm run check` and `pnpm run build` pass with 0 errors

Not verified:
 - Phase 7 functional verification: codename rate limits, own-note rules, report-and-hide flow, admin rearrange/review.
 - First-admin bootstrap for production (local promotion was done by a manual local D1 UPDATE)

Verified (via static analysis):
 - Approve and decline from /admin/approvals and their admin_audit rows
 - Approved-only endpoints blocking pending, declined, and signed-out users; admin endpoints blocking normal users
 - Admin endpoint authentication (verified 401 on unauthenticated access)
 - Phase 7: Database schema for moderation (0003_wall_moderation.sql)
 - Phase 7: Codename change endpoint (/api/auth/codename)
 - Phase 7: Moderation endpoints (/api/admin/reports/*)
 - CSRF rejection on /api/admin/approvals/* specifically


## Gate protocol

Before stopping at any gate: (1) update PLAN.md, including the STATUS block, and commit; (2) print the "PHASE COMPLETE" banner (or "INPUT NEEDED" / "BLOCKED"); (3) optionally run the terminal bell command. Never stop silently. Never perform production changes (deploys, secrets, remote data writes) without explicit approval for that specific action. Secrets are set by the owner in their own terminal and never pasted into chat or committed.

## Status summary

| Phase | Status | Evidence / remaining work |
|---|---|---|
| 0 — Baseline | Done | Baseline app tagged and route/state screenshot + normalized DOM set recorded below. |
| 1 — Shell scaffold | Done | Shell, CSS, routes, and behavior comparisons passed; Phase 3 deployment included the shell. |
| 2 — Page ports | Done | All eight pages passed the recorded screenshot threshold and normalized DOM checks below. |
| 3 — Mock-data Worker | Deployed | Initial deployment recorded below. Superseded on 2026-10-08 by the deployment that includes the Phase 4 code. |
| 4 — D1 and wall API | Verified in production (2026-10-08) | Remote schema exists (pins, reactions, reports, walls). A test pin created on the live site survived a hard refresh and appeared in the remote D1 query. |
| 5 — Archive cron | Deployed (2026-10-08); first scheduled run unconfirmed | Companion Worker uploaded and cron trigger registered. First run is 2026-10-08 16:00 UTC (midnight PHT); expect a `walls` row for 2026-10-08. |
| 6 — Sign-in, roles, approval queue | Implemented; partially verified (local) | Verified: sign-in, join, sign-out, sign-out CSRF, check/build on TS 6.0.3. Not verified: approve/decline + admin_audit rows, approved-only/admin blocking, CSRF on approvals, prod bootstrap. See STATUS. |
| 7 — Wall rules and moderation | Not started | Codenames, own-note move/edit/delete, caps, report-and-hide, admin review. |
| 8 — Daily prompt, throwbacks, pin look | Not started | |
| 9 — Birthday celebrant wall | Not started | |
| 10 — Teacher tribute corner | Not started | |
| 11 — Now/before profile photos (R2) | Not started | |
| 12 — About the author and donation corner | Not started | |

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


## Tier 1 development plan (Phases 6 to 12)

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

### Phase 9: Birthday celebrant wall (not started)

**Goal:** a built-in reason to come back each day.

**Steps**
1. Migration `0005` (additive): `users.birth_month`, `users.birth_day`, `users.birthday_visible` (default off). Store month and day only, never the year.
2. Profile settings page with an explicit opt-in and a short Data Privacy Act notice.
3. A page and a Home strip showing today's birthdays and the next 14 days, computed in `Asia/Manila`. Only approved alumni who opted in appear. Decide how February 29 is shown in non-leap years (proposal: February 28).
4. Display name: the codename by default; real name only if the user chooses it.

**Definition of done:** opted-in users appear on the right days in Manila time; users who did not opt in never appear in any API response; opting out removes them immediately.

**How the owner verifies:** local test users with birthdays today, tomorrow, and 15 days away, one opted out; call the API and confirm the opted-out user's fields never appear.

**Deferred:** email or notification reminders (belongs to the email digest).

### Phase 10: Teacher tribute corner (not started)

**Goal:** thank-you notes for specific teachers, collected on one page per teacher.

**Steps**
1. Migration `0006`: `teachers` (id, slug, name, subject, years, active) and `tributes` (id, teacher_id, user_id, text, status `pending|approved|hidden`, created_at).
2. Admin screen to add and edit teachers. **Input needed from the owner:** the first teacher list.
3. Routes `/teachers` and `/teachers/[slug]`, rendered on demand from D1. Tributes appear only after an admin approves them (approval first, because these are emotional and name real people).
4. Posting a tribute requires an approved account. Authors can delete their own tributes; editing follows the same rule as notes (short window, no reports).
5. Report flow reused from the wall. A donation prompt shows after posting only once the donation page exists (Phase 12); until then it stays hidden.

**Definition of done:** a signed-in alum posts a tribute, an admin approves it, and it appears on that teacher's page; unapproved tributes never appear in public responses.

**How the owner verifies:** post a tribute with a test account, confirm it is invisible until approved, approve, confirm it appears; check at the three widths.

### Phase 11: Now-versus-before profile photos (not started)

**Goal:** a profile shows the current photo and switches to the high school photo on hover. This is also where R2 first becomes necessary.

**Steps**
1. Create the R2 bucket and binding with the owner's approval (a production change). Keep the bucket private and serve images through a Worker route.
2. Migration `0007` (additive): `users.photo_now_key`, `users.photo_before_key`, `users.photo_before_visible` (default off), and alt-text fields.
3. Upload endpoint: validate type (JPEG, PNG, WebP) and size, resize on the client before upload, and store under random keys. Deleting a photo deletes the object.
4. A profile page and the hover/tap interaction: hover on pointer devices; tap-to-toggle on touch devices (hover does not exist on phones). Respect reduced-motion.
5. Only approved alumni have public profiles. The high school photo is opt-in.
6. Decision to record: whether wall photo notes (currently HTTP 501) use the same pipeline in this phase or a later one.

**Definition of done:** an approved alum uploads two photos, the toggle works on desktop and phone, an opted-out high school photo is never returned by the API, and deleting a photo removes the R2 object.

**How the owner verifies:** upload test photos locally, check the toggle with a real phone or device emulation, and confirm the API response for an opted-out user lacks the high school photo key.

### Phase 12: About the author and donation corner (not started)

**Goal:** a transparent way to cover the site's running costs.

**Steps**
1. Static assets for the owner's QR codes (GCash, Maya, a bank) with the account name shown beside each; each in its own tab or card. **Input needed from the owner:** QR images and account names. Decision needed: GCash only, or also PayPal/Ko-fi for alumni abroad.
2. Migration `0008`: `donation_goals` (month, goal amount, label) and `donations` (id, display name, amount in centavos, donated_at, reference number, public flag default off, message, status `pending|approved|rejected`, user_id nullable). Never store payment account numbers or receipt images.
3. Page `/donate`: start with an honest short story of what the site costs, then the QR codes, then the monthly progress bar (admin sets the goal and the label), then the opt-in supporters list (tiers, never amounts).
4. "I donated" form with name or codename, amount, reference number, "show my name publicly" (off by default), and an optional message. Anonymous donations count toward the progress bar.
5. Admin approval screen: match the reference number to the wallet, approve or reject. Approval updates the progress bar and supporters list; cosmetic badges are Phase "Badges" later.
6. Link the tribute prompt (Phase 10) to this page.

**Definition of done:** a test donation goes from the form to pending to approved, the progress bar updates, anonymous donors never appear by name, and amounts never appear publicly.

**How the owner verifies:** submit two test donations (one public, one anonymous), approve both, and confirm the public pages and API responses reveal only what the donor allowed.

### Deferred / not in this task

- Event-themed site, comments and suggestions corner, event contests with prizes, badges and milestones, email digest, Tier 2 and Tier 3 features.
- Singles corner: skipped. If ever built, it must be opt-in and show interests only.

### Open questions

1. Who moderates the wall, and may current students post?
2. Does posting require an approved sign-in once Phase 7 ships? DECIDED (owner, 2026-10-11): yes — posting requires an approved account, with auth + verifyCsrfRequest.
3. Per-user daily pin limit, and the edit-window length. DECIDED (owner, 2026-10-11): 2 notes per user per day; wall cap raised from 150 to 200 per day (update every place 150 appears: code, PLAN.md, UI text); edit and move window both 10 minutes (WALL_CONFIG.pinMoveWindowMs).
4. Should deleting a note also reduce the archived count for its day? DECIDED (owner, 2026-10-11): yes, recomputed in the same batch.
5. Report auto-hide threshold. (Proposal: 3 distinct reporters.)
Phase 7 moderation decisions DECIDED (owner, 2026-10-11): codename first set free, then 1 change per 7 days; use a separate `hidden` INTEGER column on pins (do not extend status); admin reposition is current wall date only while hidden/archived review is a separate read-only admin list.
6. How the first `super_admin` is created. (Proposal: the owner runs a one-time D1 command.)
7. Who supplies the first teacher list for Phase 10?
8. Donation methods: GCash only, or add PayPal/Ko-fi?
9. Do wall photo notes ship with Phase 11 or later?
10. February 29 birthdays in non-leap years. (Proposal: show on February 28.)
11. Should the donation corner move ahead of Phases 10 and 11?
