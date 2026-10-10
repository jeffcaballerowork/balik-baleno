# Balik Baleno migration plan

## STATUS

Verified locally:
- Google sign-in, /join form with validation, pending state
- Sign-out: cookie cleared, session row deleted, /api/auth/me returns null
- CSRF on POST /api/auth/signout: 200 with valid token and Origin; 403 csrf_invalid with wrong Origin, missing token, or wrong token
- TypeScript pinned to 6.0.3 (astro check does not support TS 7); `pnpm run check` and `pnpm run build` pass with 0 errors

Not verified:
- Approve and decline from /admin/approvals and their admin_audit rows
- Approved-only endpoints blocking pending, declined, and signed-out users; admin endpoints blocking normal users
- CSRF rejection on /api/admin/approvals/* specifically
- First-admin bootstrap for production (local promotion was done by a manual local D1 UPDATE)


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
| 6 — Sign-in, roles, approval queue | Not started | Foundation for every Tier 1 feature below. See the Tier 1 development plan. |
| 7 — Wall rules and moderation | Not started | Codenames, own-note move/edit/delete, caps, report-and-hide, admin review. |
| 8 — Daily prompt, throwbacks, pin look | Not started | |
| 9 — Birthday celebrant wall | Not started | |
| 10 — Teacher tribute corner | Not started | |
| 11 — Now/before profile photos (R2) | Not started | |
| 12 — About the author and donation corner | Not started | |

Where a phase section below disagrees with this table or with the Production checklist, this table and the checklist win. The phase sections for Phases 0 to 5 are a historical record written at the time and are not rewritten.

Production deployment and launch readiness are tracked in the [Production checklist](#production-checklist). The site must remain `noindex, nofollow` until public launch is approved.
## Phase 0 — baseline (complete)

- The untouched Vite + React baseline is tagged `figma-make-baseline` at commit `a65ec42`.
- The app was run from the existing Vite setup at `http://127.0.0.1:8443/`.
- Captures are in [`design/baseline/`](./design/baseline/): 24 full-page route screenshots (390×844, 768×1024, and 1440×900), 12 requested interactive/scroll-state screenshots, 36 normalized `#root` DOM snapshots, and a manifest. Playwright used a fixed `2026-10-04T10:00:00+08:00` clock, `Asia/Manila`, reduced motion, disabled screenshot animations, and waited for fonts and images. No console or page errors were observed.
- The requested logo exists at `public/baleno-national-high-school-logo.jpg`.
- The repo did **not** contain the `.mise.toml` referenced by the supplied project instructions. Phase 1 now pins the currently available versions, Node `v22.23.2` and pnpm `12.8.1`.
- `npm view astro version` reported `7.3.5` as the latest stable Astro release at the time of this baseline. Recheck at scaffold time and install matching current Astro integrations rather than pinning from memory.
- The user confirmed that the generated batch routes include 1996 as the oldest year.

### Figma Make items to remove

- `vite.config.ts` imports `.figma/make/site.json` and embeds Figma-only Vite plugins. These include the site-configuration HTML placeholder transform, error-overlay replay, React refresh fallback, and the Figma Make Kit virtual module/blank `/.figma/make/kit.html` route.
- `index.html` relies on Figma comment slots such as `figma:lang` and `figma:head-start` for generated shell metadata.
- `.figma/` and the Figma-specific `AGENTS.md` and `CLAUDE.md` are scaffold leftovers. Replace the instruction files with the exact repository rules supplied in the task and remove the Figma directory/configuration in the scaffold phase, not during baseline capture.

### Existing component and behavior inventory

| Existing area | Current responsibilities | Migration treatment |
|---|---|---|
| `App` shell | Hash route selection; shared announcement, sticky header, footer, footer disclaimer, and selected-note lightbox state | Astro layout and real route links; retain `.app-shell` and shell markup/classes. Header behavior becomes a small vanilla TypeScript script. |
| Header / Logo / Icon | Brand logo, nav active state, menu toggle, shared SVG symbols | Shared Astro shell components; one `icon-paths.ts` shared with the React `Icon.tsx`. Keep mobile `header-scrolled`, `header-hidden`, and `nav-open` behavior. |
| Footer | Brand, explore links, copyright, school founding text, unofficial-site disclaimer | Shared footer on every route; preserve the exact disclaimer. |
| Home | Hero, preview wall, ticker, introduction, news/event previews, batch year grid, wall of fame, join CTA | Static Astro markup except `HeroWall` (`client:visible`). Fix year-grid destinations to their selected year as specified. |
| Wall | Heading/timer, board frame, note board, archive/create actions | Static Astro frame plus `WallBoard` (`client:only="react"`); preserve the existing drag, pan, pinch and zoom implementation and its `window.innerWidth` initial zoom. |
| Create | Paper selection, text, font/ink/sticker controls, optional local photo preview, SVG drawing, pin action | `CreateEditor` (`client:load`); preserve markup/classes and preview behavior. Photo upload remains unavailable in the D1 phase and shows the specified coming-soon copy. |
| Archive | Calendar month/day selection, derived archive notes, note opening | Static Astro page plus `ArchiveCalendar` (`client:only="react"`); it uses today's `Date`. |
| News | News cards and wall CTA | Static Astro page. |
| Events | Event cards and local RSVP toggles | Static Astro content plus `EventRsvp` (`client:visible`). |
| Batches / Batch | Batch-year list, class summary, member cards, note CTA | Static Astro routes; `/batches/[year]` generated from 2025 down to the confirmed lower year. |
| NoteCard / Lightbox | Shared note rendering; note navigation, reactions, report, Escape/arrow keyboard controls | Keep `NoteCard` as a shared React component. Mount one `NoteLightbox` at layout level (`client:idle`) and open it from islands through a nanostores `{ note, notes }` atom. |

### Routes and island map

| URL | Page | Interactive React island(s) |
|---|---|---|
| `/` | Home | `HeroWall` (`client:visible`), layout `NoteLightbox` (`client:idle`) |
| `/wall` | Freedom Wall | `WallBoard` (`client:only="react"`), layout `NoteLightbox` |
| `/create` | Create a note | `CreateEditor` (`client:load`), layout `NoteLightbox` |
| `/archive` | Archive | `ArchiveCalendar` (`client:only="react"`), layout `NoteLightbox` |
| `/news` | News | Layout `NoteLightbox` |
| `/events` | Events | `EventRsvp` (`client:visible`), layout `NoteLightbox` |
| `/batches` | Batch list | Layout `NoteLightbox` |
| `/batches/[year]` | Batch detail | Layout `NoteLightbox` |

All page routes are prerendered; API endpoints opt into on-demand rendering with `export const prerender = false`. Do not add Astro view transitions or `ClientRouter`.

## Phase 1 — shell scaffold (done)

The Vite app has been replaced by an Astro `7.3.5` static-output scaffold using `@astrojs/react 7.0.0`, `@astrojs/cloudflare 14.3.3`, React 19, Tailwind v4 via `@tailwindcss/vite`, and strict TypeScript. `.mise.toml` pins the already available Node `22.23.2` and pnpm `12.8.1`. Playwright `1.63.0` and Chromium are installed for visual regression work.

| Baseline check | 390×844 | 768×1024 | 1440×900 | Result |
|---|---:|---:|---:|---|
| Announcement DOM and computed styles | Match | Match | Match | Pass |
| Header DOM and computed styles | Match | Match | Match | Pass |
| Footer DOM and computed styles | Match | Match | Match | Pass |
| Global CSS bytes | Same SHA-256 | Same SHA-256 | Same SHA-256 | Pass |

The shell DOM comparison covers the same element tree, class names, and text. The new `data-nav` attributes on buttons are the only intentional shell attributes added for vanilla-script navigation. Header behavior was smoke-tested: mobile scroll down/up toggles the expected classes, menu toggles `nav-open` and its label/icon, the announcement scrolls away, and navigation reaches `/news`. The `/batches/1996` route renders with the expected title. Footer disclaimer text remains exact.

Phase 1 intentionally has empty, tall page placeholders; page bodies have not been ported yet, so full-page screenshots are **not** expected to match until their individual Phase 2 steps. The 1600px placeholder only makes the shell scroll state testable and will be replaced by each page implementation.

`pnpm run check` passed with 0 errors, warnings, and hints. `pnpm run build` passed and generated 37 static pages, including all 30 batch detail paths from 2025 through 1996. Browser smoke tests reported no page or console errors.

### Mock-data inventory

Mock content currently lives in `src/App.tsx` and moves to `src/data/mock.ts` with the required `MOCK, replace before public launch` header:

- `initialNotes`: 20 wall notes, including author names, note kind, positions, colors, rotations, doodles/drawings, and three remote Unsplash photo URLs.
- `newsItems`: three news cards with dates, descriptions, categories, and the shared photo URLs.
- `events`: three sample events and their dates/content.
- Inline preview avatar initials, home statistics, batch count formula, eight class-member names, and archive-note filtering/counts are also demo data and must stay labelled/reviewable as mock content. Keep real-looking alumni/community claims out of production data.

### Phase-by-phase execution

1. **Phase 0 — baseline (done):** tagged and ran the untouched app; saved route/state screenshots and normalized DOM.
2. **Phase 1 — scaffold and shell (done):** Astro routes/layout, strict TypeScript, shared shell components, Cloudflare adapter, Tailwind v4 Vite plugin, verbatim global CSS move, Figma cleanup, and confirmed batch paths are in place. Shell DOM and computed style checks match baseline at all three viewport widths.
3. **Phase 2 — pages (done):** Home → Wall → Create → Archive → News → Events → Batches → Batch. All pages were compared at the three widths, normalized DOM was checked, interactive states were smoke-tested, and the recorded results are below.
4. **Phase 3 — mock-data Cloudflare Worker (deployed):** Worker static assets (not Pages), build/check, and the initial `pnpm wrangler deploy` were verified. The currently deployed version must be checked before considering the production API current.
5. **Phase 4 — D1 and wall API (implemented and locally verified):** migrations and typed, Zod-validated JSON endpoints use parameterized D1 statements; mock seed data is local only. Photo submissions return 501 until R2 exists. The resolved quotas are 150 pins per wall day and 5 per device per day. Remote schema application was recorded; verify current production state in the checklist below.
6. **Phase 5 — archive cron (implemented and locally verified):** uses the UTC `0 16 * * *` trigger for midnight PHT. Cloudflare's current cron documentation requires a Worker module `scheduled()` handler and Wrangler-managed `triggers.crons`. The Astro adapter does not document a supported scheduled-handler composition, so a companion Worker shares the D1 binding and upserts the wall that just ended in `Asia/Manila` idempotently. Production deployment and trigger registration remain to be verified.

### Phase 2 progress

| Page | Status | Visual diff (390×844 / 768×1024 / 1440×900) | DOM / behavior |
|---|---|---|---|
| Home | Pass | 0.0048% / 0.0010% / 0.0005% differing pixels (≤0.1%) | Normalized DOM matches; lightbox open/arrow/Escape and year-specific batch navigation smoke-tested |
| Wall | Pass | 0.0021% / 0.0001% / 0.0001% differing pixels (≤0.1%) | Normalized DOM matches; zoomed-out state 0.0030%, note lightbox 0.0000%; pan, note drag, pointer-open, zoom, and Escape smoke-tested |
| Create | Pass | 0.0015% / 0.0000% / 0.0000% differing pixels (≤0.1%); paper and Draw states 0.0000% | Normalized DOM matches for all eight page/editor states; 220-character limit, paper/font/sticker/anonymous/drawing controls, mock pin-to-wall flow, and lightbox smoke-tested |
| Archive | Pass | 0.0018% / 0.0000% / 0.0004% differing pixels (≤0.1%); another-day state 0.0000% | Normalized DOM matches all four states; month navigation, selected-day preview, note lightbox, and return-to-wall navigation smoke-tested |
| News | Pass | 0.0039% / 0.0000% / 0.0000% differing pixels (≤0.1%) | Normalized DOM matches; all images loaded; “Leave it on the wall” CTA navigates to Create |
| Events | Pass | 0.0020% / 0.0000% / 0.0000% differing pixels (≤0.1%); RSVP-toggled state 0.0000% | Normalized DOM matches all four states; RSVP toggle on/off smoke-tested |
| Batches | Pass | 0.0061% / 0.0025% / 0.0043% differing pixels (≤0.1%) | Normalized DOM matches; links to both /batches/2016 and /batches/1996 verified |
| Batch | Pass | 0.0017% / 0.0000% / 0.0000% differing pixels (≤0.1%) | Normalized DOM matches at all three widths; class 2016, class 1996, back-to-directory, and Create CTA routes verified |

Home's static content is in `src/components/HomePage.astro`; only its preview wall hydrates through `HeroWall` (`client:visible`). `NoteCard` is shared, and the layout-level `NoteLightbox` uses a nanostores atom (`client:idle`). The data module is marked `MOCK, replace before public launch` and contains the sample notes, news, events, member names, and Home preview counts/initials. The Astro dev toolbar is disabled so it cannot contaminate screenshot comparisons; it is not part of the production page.

The Freedom Wall heading and frame are static Astro markup in `src/components/WallPage.astro`; `WallBoard` is a `client:only="react"` island with its original pan, pinch, zoom, and note-drag logic.

`CreateEditor` is the `client:load` island. During the Phase 2 page port, created mock notes were kept in session storage and loaded onto the mock wall; Phase 4 later wired the same editor to the D1 API.

#### Archive — Phase 2 page port

The Archive heading stays static in `src/components/ArchivePage.astro`; `ArchiveCalendar` is the `client:only="react"` island because its calendar and preview depend on the current date and selected day. In the Phase 2 port, archive notes were mock data and opened in the layout-level lightbox; Phase 4 later connected the same UI to D1, as recorded in the Phase 4 implementation notes below.

News is entirely static Astro markup in `src/components/NewsPage.astro`; its cards use the shared mock news dataset and the call to action routes to Create.

The Events heading and disclaimer are static Astro markup; `EventRsvp` is the `client:visible` island for the preview-only RSVP toggles.

The Batches directory is static Astro markup; each class card now navigates to its real `/batches/{year}` route.

Each `/batches/{year}` page is statically generated for 2025–1996. The legacy Batch view had no active navigation item, so the shared header keeps the nav unselected on year-detail routes while highlighting Batches on `/batches`.

## Current platform documentation checked

Checked the current official Astro Cloudflare integration and deployment guides and Cloudflare Wrangler configuration, Workers static-assets, and Cron Triggers documentation before selecting a deployment direction:

- Astro Cloudflare integration: <https://docs.astro.build/en/guides/integrations-guide/cloudflare/>
- Astro Cloudflare deployment: <https://docs.astro.build/en/guides/deploy/cloudflare/>
- Astro on-demand rendering: <https://docs.astro.build/en/guides/on-demand-rendering/>
- Cloudflare Worker secrets: <https://developers.cloudflare.com/workers/configuration/secrets/>
- D1 Worker bindings: <https://developers.cloudflare.com/d1/worker-api/>
- D1 migrations: <https://developers.cloudflare.com/d1/reference/migrations/>
- D1 Wrangler commands: <https://developers.cloudflare.com/d1/wrangler-commands/>
- Wrangler configuration: <https://developers.cloudflare.com/workers/wrangler/configuration/>
- Workers static assets: <https://developers.cloudflare.com/workers/static-assets/binding/>
- Cron Triggers: <https://developers.cloudflare.com/workers/configuration/cron-triggers/>

The current Astro docs confirm static prerendering is the default and adapters are needed for on-demand routes. The Cloudflare deployment guide identifies the adapter server entrypoint for Wrangler; Wrangler supports a Workers `assets` configuration for static delivery, and its current docs permit assets-only Workers without `main` (not appropriate when Astro API routes need the adapter). Cron is UTC and is dispatched to `scheduled()`, not an Astro route. Phase 5 keeps Astro's documented server entrypoint intact and uses a small companion Worker for the scheduled handler on the same D1 binding.

The installed adapter enables Cloudflare Images and session KV by default. Neither is needed for this static mock-data phase, so `imageService: "passthrough"` and top-level `session: false` are configured to avoid implicitly requesting `IMAGES` or `SESSION` resources. D1 is intentionally not configured until Phase 4.

### Phase 3 — mock-data Cloudflare Worker (deployed)

- Added `wrangler.jsonc` for the Astro Cloudflare Worker entrypoint and Workers static assets. It uses compatibility date `2026-10-05`, the Astro deployment guide's `global_fetch_strictly_public` compatibility flag, a custom 404 asset, and `drop-trailing-slash` to honor Astro's `trailingSlash: "never"`.
- `pnpm wrangler types` completed. `pnpm run check` passed with 0 errors, warnings, or hints; `pnpm run build` generated all 37 static pages; Wrangler dry-run read 94 assets; `pnpm wrangler deploy` succeeded.
- Initial deployment recorded at <https://balik-baleno.jeffcaballero-work.workers.dev> (Worker version `d4ae47d4-5aa0-41ac-bd2b-abd4d1d2df38`). Browser smoke tests returned 200 for all eight routes plus batch years 2016 and 1996, preserved slashless URLs and the footer disclaimer, confirmed `noindex, nofollow` on the workers.dev preview, and reported no page or console errors. This is not evidence that the current Phase 4 API code is deployed.
- No D1 bindings, API routes, or cron triggers were added in Phase 3. The user approved continuing into Phase 4.

### Phase 4: D1 and wall API (implemented; verified in production on 2026-10-08)

- Resolved limits: 150 pins per wall day and 5 pins per device per day. The 150-pin ceiling keeps to the supplied conservative limit for the fixed logical canvas; `src/config.ts` is configured with both approved limits.
- Provisioned the new APAC production database `balik-baleno-db`, bound as `DB`. The production database remains unseeded.
- Added the initial schema migration and `src/config.ts` with the two quotas and shared 1480×1130 logical canvas dimensions. The migration defines pins, reactions, reports, and walls.
- `wrangler.jsonc` now enables Workers logs/traces and declares the production D1 binding. `OWNER_HASH_SALT` is not stored in config; configure a local `.dev.vars` secret and a Cloudflare secret before enabling writes.
- Applied `0001_initial_schema.sql` to both local D1 and the remote APAC database. Verified all four application tables exist; remote D1 contains zero pins.
- Regenerated the compact `worker-configuration.d.ts` using `pnpm wrangler types --include-runtime false`; Astro check reports 0 errors/warnings/hints, build still produces 37 static pages, and Wrangler dry-run recognizes `env.DB`.
- Added on-demand `GET /api/wall`: it validates optional calendar dates, reads active pins with a parameterized D1 query, and computes the next midnight PHT `resetsAt`. Local smoke tests returned an empty wall with `2026-10-05T16:00:00.000Z`, returned `2026-10-04T16:00:00.000Z` for that selected date, and rejected `2026-02-30` with JSON 400.
- Added the hard-coded `--local` `pnpm run seed:local` script for development fixtures. It seeds 20 existing mock notes and their sample reactions on each of the latest three wall dates. Verified 60 local pins and 2,640 local reactions; remote D1 remains at zero pins.
- Wired Home's wall preview and `/wall` notes to `GET /api/wall`, and replaced the wall countdown placeholder with the API's reset time. The local response returns 20 pins for `2026-10-04`, preserves their order, geometry, colors, and reset timestamp, and rejects an invalid date with JSON 400. Sample image URLs are exposed only from local seed rows.
- Rechecked Home and Wall at all three baseline viewports. With the fixed browser clock and selected-day reset fixture, changed pixels (any RGB channel delta >8) were 0.0160% / 0.0086% / 0.0044% for Home and 0.0405% / 0.0892% / 0.0512% for Wall (all ≤0.1%). The API-driven countdown intentionally differs from the old mock countdown. No browser console or page errors remained after restarting the stale local dev server.
- Added `POST /api/pins` with Zod validation, a localStorage device token, salted SHA-256 ownership hashing, and a single conditional insert enforcing the 150-active-pin wall cap and five-pin device limit. IDs and z-order are assigned by the server; owner hashes are not returned. Photo-selected requests return HTTP 501 without storing image data.
- Wired the existing Create editor to submit to D1 and navigate to `/wall` only after success. API errors use the existing preview caption, including the exact “Photo uploads are coming soon” message.
- Historical quota test: before the device limit was resolved to five, local tests accepted two pins for one device and rejected its third with 429. After updating `src/config.ts` to five, local API verification accepted exactly five pins and returned 429 for the sixth; all five temporary pins were removed. The earlier run also returned 501 for a photo pin and verified successful editor submission renders on `/wall` with a 64-character localStorage token. The development fixtures remain local. The Create page screenshot differs from baseline by 0.0051% / 0% / 0% at 390×844 / 768×1024 / 1440×900 (≤0.1%); no page errors were observed.
- Added `PATCH /api/pins/:id/position`. It hashes the device token, updates only active pins on the current Manila wall date, and enforces the ten-minute creation window in both the check and conditional update. The wall read endpoint returns a non-sensitive `canMove` flag only when the caller's token owns an in-window pin.
- The Wall island now sends its device token in a request header, persists only eligible note drags, and restores the prior position while showing the API message if a save fails. Other drags remain local exploration and do not change the existing wall behavior.
- Verified a created pin's drag persisted from (520, 320) to (578.18, 352.73); another token received 403, an expired pin received 403, and a previous-day pin received 404. Anonymous wall reads did not disclose the `canMove` capability. The temporary movement pin was removed.
- Rechecked Home and Wall screenshots at all three widths: 0.0160% / 0.0086% / 0.0044% and 0.0405% / 0.0892% / 0.0512% changed pixels respectively (≤0.1%). Wall zoomed-out and note-lightbox states differ by 0.0012% and 0%; browser reported no page or application console errors.
- `pnpm run check` reports 0 errors, warnings, or hints; `pnpm run build` succeeds with all 37 static pages and the API Worker entrypoint.
- Added `POST /api/pins/:id/reactions` with validated pin IDs, device tokens, and reaction kinds. A sequential D1 batch atomically removes an existing device vote or inserts one only when that device has not voted; inactive or missing pins return 404. The response includes real totals and the caller's reaction state for all three kinds.
- Extended `GET /api/wall` with grouped D1 reaction counts and state scoped to the salted device-token hash. Home supplies the same device token as Wall, so opening a note from either surface shows persisted counts and the caller's state. Mock-only lightbox counts remain explicitly in `data/mock.ts` for Archive entries not yet connected to D1.
- Replaced the lightbox's fixed API-note counts with the returned values and wired toggles to D1; API errors are logged and shown in the lightbox without changing its normal layout. Browser/API checks toggled Love 24→25→24, verified a different device saw the increased global count but its own `reacted` state stayed false, and confirmed all local test votes were removed.
- Rechecked Home and Wall at 390×844 / 768×1024 / 1440×900 with the fixed reset-time fixture. Changed pixels: Home 0.0041% / 0.0007% / 0.0002%; Wall 0.0080% / 0.0060% / 0.0031%; note lightbox 0.0000%. All passed the ≤0.1% threshold; no browser console or page errors occurred.
- Added `POST /api/pins/:id/report` with validated IDs/device tokens and a parameterized conditional insert that only reports active pins. The server stores a salted reporter hash, generated report ID, and timestamp, and returns explicit 400/404/500 errors.
- Wired the shared lightbox Report action to the API for D1-backed notes; successful reports show the existing confirmation text, while failures are logged and shown inline. Local mock/archive notes retain their original client-only confirmation until the archive API is connected.
- Verified invalid tokens return 400, missing pins return 404, and a valid report returns 201. Browser interaction confirmed “Reported · thank you”; the pre-action lightbox screenshot differs by 0.0000%, with no page or console errors. Temporary report rows were removed; local and remote report counts are both zero.
- `pnpm run check` reports 0 errors, warnings, or hints; `pnpm run build` completes successfully with all 37 static pages and the Worker API entrypoints.
- Extracted the shared D1 pin/reaction mapping into `src/lib/wall-pins.ts` so current-wall and archive reads preserve identical note fields, counts, device reaction state, and movement eligibility without duplicating conversion logic.
- Added `GET /api/archive/days?month=YYYY-MM` using grouped active-pin counts and `GET /api/archive/:date` using the shared pin reader. Both validate inputs and return typed JSON; archived pins keep their reaction data, while movement eligibility remains false for past wall dates.
- Wired `ArchiveCalendar` to load month counts and the selected date from the API. Manila-local dates determine the default selection and disabled future days; calendar dots appear only for dates with active pins, the displayed note count is real, and archive notes open in the shared lightbox. Errors are logged and shown without changing normal layout.
- Updated the local-only seed script to refresh only `local-seed` rows for the latest five dates: 20 notes for today and 13 filtered archive notes per prior date, preserving the existing Archive baseline content. Local seed contained 72 pins and 3,168 reactions across October 1–5, 2026; temporary reports were absent. Production D1 was recorded at zero pins, reactions, and reports.
- Verified October month counts (13 pins on October 1–4 and 20 on October 5), selected-date results (13 notes), real Archive lightbox reaction counts, and 400 responses for invalid month/date values. Archive screenshot diffs at 390×844 / 768×1024 / 1440×900 were 0.0063% / 0.0004% / 0.0041%; another-day-selected was 0.0000%. Rechecked Home/Wall after the shared-reader extraction: Home 0.0041% / 0.0007% / 0.0002%; Wall 0.0080% / 0.0060% / 0.0031%; lightbox 0.0000%. All were within the ≤0.1% limit with no browser errors.
- `pnpm run check` reported 0 errors, warnings, or hints; `pnpm run build` completed successfully with all 37 static pages and the Worker API entrypoints.
- Current Astro on-demand docs support individual `export const prerender = false` endpoints while retaining static site output; API handlers use the Cloudflare adapter runtime binding for D1.
- Current Cloudflare D1 migration, query, and Wrangler command documentation was checked. Prepared statements with bound values are used; local (`--local`) and remote operations are kept distinct.

### Phase 5: daily archive cron (implemented; deployed to production 2026-10-08; first scheduled run not yet confirmed)

- Current Cloudflare Cron Trigger docs specify UTC scheduling and a `scheduled()` module handler; the installed Wrangler 4.147.0 schema supports top-level `triggers.crons`, and its `wrangler dev --test-scheduled` endpoint allows local event tests with explicit cron/time values.
- Current Astro Cloudflare adapter docs prescribe `@astrojs/cloudflare/entrypoints/server` as the fetch entrypoint and do not document a scheduled-handler extension. Added a small companion Worker instead of wrapping adapter internals; it uses the same existing D1 binding and does not change Astro request/static-asset routing.
- Added `wrangler.cron.jsonc` for the `balik-baleno-archive` companion Worker, sharing the existing `balik-baleno-db` binding and configuring `0 16 * * *` (UTC midnight in Manila). Added `pnpm run dev:cron` to run the handler locally with remote bindings disabled.
- The scheduled handler derives the previous Manila calendar date from `controller.scheduledTime - 1 ms`, then performs one parameterized D1 upsert of that date's active-pin count and the scheduled timestamp. The operation also creates a zero-count `walls` row for an empty day; retrying an event updates the same primary-key row.
- Generated companion binding/runtime declarations using Wrangler 4.147.0. Local dry-run bundles the companion Worker and recognizes `env.DB`; no production deployment was performed.
- Local scheduled-event verification at `2026-10-05T16:00:00Z` upserted `2026-10-05` with 20 pins. Replaying the same event left one row with the same count/timestamp. A simulated `2026-10-06T16:00:00Z` event created a zero-count row for `2026-10-06`. Temporary test rows were removed afterward; production D1 was not touched.
- Manual local test: start `pnpm run dev:cron`, then request `http://127.0.0.1:8788/cdn-cgi/local/scheduled?cron=0+16+*+*+*&time=1791216000000&format=json`. The local Worker returns a successful scheduled-event outcome; query local D1's `walls` table to inspect the finalized day.
- `pnpm run check` and `pnpm run build` passed; Home, Wall, and Archive screenshots remained within the established ≤0.1% baseline tolerance.
- References: <https://developers.cloudflare.com/workers/configuration/cron-triggers/>, <https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/>, <https://developers.cloudflare.com/workers/examples/cron-trigger/>, <https://developers.cloudflare.com/workers/wrangler/configuration/>, <https://docs.astro.build/en/guides/integrations-guide/cloudflare/>, <https://docs.astro.build/en/guides/deploy/cloudflare/>.

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

### Phase 6: Sign-in, roles, and approval queue (locally implemented; verification blocked)

Verified locally: Google sign-in, join form with validation, pending state, approve and decline from /admin/approvals, admin_audit rows written, approved-only endpoint blocking.
Not verified: sign-out (cookie and session-row deletion), CSRF rejection with a missing token, TypeScript pin and `pnpm run check`/`pnpm run build` (astro check does not support TypeScript 7).

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
2. Does posting require an approved sign-in once Phase 7 ships? (Proposal: yes.)
3. Per-user daily pin limit, and the edit-window length. (Proposal: same as the ten-minute move window.)
4. Should deleting a note also reduce the archived count for its day? (Proposal: yes, recomputed in the same batch.)
5. Report auto-hide threshold. (Proposal: 3 distinct reporters.)
6. How the first `super_admin` is created. (Proposal: the owner runs a one-time D1 command.)
7. Who supplies the first teacher list for Phase 10?
8. Donation methods: GCash only, or add PayPal/Ko-fi?
9. Do wall photo notes ship with Phase 11 or later?
10. February 29 birthdays in non-leap years. (Proposal: show on February 28.)
11. Should the donation corner move ahead of Phases 10 and 11?
