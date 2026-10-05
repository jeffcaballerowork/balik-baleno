# Balik Baleno migration plan

## Status summary

| Phase | Status | Evidence / remaining work |
|---|---|---|
| 0 — Baseline | Done | Baseline app tagged and route/state screenshot + normalized DOM set recorded below. |
| 1 — Shell scaffold | Done | Shell, CSS, routes, and behavior comparisons passed; Phase 3 deployment included the shell. |
| 2 — Page ports | Done | All eight pages passed the recorded screenshot threshold and normalized DOM checks below. |
| 3 — Mock-data Worker | Deployed | Initial Worker deployment is recorded below; the currently deployed version still needs production verification. |
| 4 — D1 and wall API | APIs verified locally; remote schema verified | All four application tables exist remotely and migration status is current. The Phase 4 Worker/API code is not deployed. |
| 5 — Archive cron | Verified locally | Scheduled handler and idempotency passed local tests; the companion Worker does not exist in the verified Cloudflare account. |

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

### Phase 4 — D1 and wall API (implemented; locally verified, production deployment unverified)

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

### Phase 5 — daily archive cron (implemented; locally verified, production deployment unverified)

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
| `OWNER_HASH_SALT` production secret | Missing: `pnpm wrangler secret list --name balik-baleno --format json` returned an empty list. The value was not requested or exposed. |
| Remote D1 schema | Verified: remote migration listing reports no migrations to apply; read-only schema inventory found `pins`, `reactions`, `reports`, and `walls`. |
| Remote D1 content | Verified: `pins`, `reactions`, `reports`, and `walls` each contain zero rows. No seed data is present. |
| Main Worker/API | The main Worker is live, but its latest recorded deployment is the Phase 3 version `d4ae47d4-5aa0-41ac-bd2b-abd4d1d2df38`, created `2026-10-05T03:01:27Z`, before the database was created. The current Phase 4 API build is not deployed; defer the requested `/api/wall` check until approval. |
| Archive companion Worker | Missing: Wrangler reports `balik-baleno-archive` does not exist in the verified account (API code 10007). The configured `0 16 * * *` schedule has only been tested locally; no production trigger is registered. |
| Public launch | Not approved. Keep `noindex, nofollow`; mock content and the unofficial-site disclaimer remain. |

After read-only checks, the remaining production actions are: set `OWNER_HASH_SALT`, deploy the main Worker, and deploy the cron companion Worker. No remote migration command is needed because the schema is current. Do not run production-changing commands until approval.

## Risks and regression checks

- **CSS cascade:** `src/index.css` contains the Google Fonts import, Tailwind import, and substantial unlayered custom CSS/overrides. Preserve every byte and order when moving it. Moving rules into a Tailwind layer or utility classes changes preflight/cascade behavior.
- **Hydration/DOM fidelity:** current app is one client-rendered React tree; Astro will create server HTML with selective islands. Keep island boundaries tight, avoid double-mounting shared state, and compare normalized `#root` markup after each port.
- **Viewport/time-dependent output:** `WallBoard` initializes zoom from `window.innerWidth`; Archive uses `Date`; the reset timer must ultimately use API `resetsAt`. Set matching time/timezone and viewport when comparing.
- **Fonts/images:** Google Fonts and Unsplash images are remote. Baseline waits for fonts and image decode; network changes or unavailable assets can produce capture noise. Do not replace fonts/assets in this migration.
- **Sticky header:** announcement must scroll away while the cream header sticks; at mobile widths scroll direction toggles `header-hidden`. Test open-menu and scroll states, preserving exact classes.
- **Static/Worker routing:** ensure prerendered paths and static assets resolve before the Worker fallback while `/api/*` is handled on demand; verify both locally and in deployed Worker previews.
- **Secrets:** `OWNER_HASH_SALT` is configured locally and declared required for deployment; the production secret must be set securely before deploying write endpoints.
