# Balik Baleno migration plan

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

## Phase 1 — shell scaffold (complete; awaiting approval)

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

1. **Phase 0 (this document and baseline only):** tag and run the untouched app; save the route/state screenshots and normalized DOM. Stop for approval.
2. **Phase 1 — scaffold and shell (complete):** Astro routes/layout, strict TypeScript, shared shell components, Cloudflare adapter, Tailwind v4 Vite plugin, verbatim global CSS move, Figma cleanup, and confirmed batch paths are in place. Shell DOM and computed style checks match baseline at all three viewport widths. Stop for approval before Phase 2.
3. **Phase 2 — pages, one at a time:** Home → Wall → Create → Archive → News → Events → Batches → Batch. Move only static sections into Astro, hydrate only the islands mapped above, and move shared sample data without changing visual output. After each page, compare screenshots at all three widths and normalized DOM with baseline, target ≤0.1% changed pixels, list/fix all differences, inspect browser console/hydration warnings, and commit that page. Stop with a page-by-page pass/fail table.
4. **Phase 3 — mock-data Cloudflare Worker:** add `wrangler.jsonc` for Worker static assets (not Pages), build/check, and verify `pnpm wrangler deploy`; report the workers.dev URL and stop.
5. **Phase 4 — D1 and wall API:** add migrations and typed, Zod-validated JSON endpoints. Add the one shared logical wall-size/coordinate constants module. Use parameterized D1 statements, `OWNER_HASH_SALT` as a secret, `.dev.vars` only for local secrets, and never apply mock seed data remotely. Wire features incrementally in this order: wall reads/countdown, pin creation, owner/time-limited position changes, reactions, reports, archive listing/day reads. Keep the UI unchanged. Photo submissions return 501 until R2 exists. Before implementation, decide the still-unspecified daily cap (150), per-device daily limit (5), and any other quota defaults; do not silently pick policy values. Report local/remote migration results and a manual test script, then stop.
6. **Phase 5 — archive cron:** use the UTC `0 16 * * *` trigger for midnight PHT. Cloudflare's current cron documentation requires a Worker module `scheduled()` handler and Wrangler-managed `triggers.crons`. Astro's deployment guide names `@astrojs/cloudflare/entrypoints/server` as the Worker `main`, but the current Astro adapter guide does not document an Astro page/API `scheduled()` hook. Therefore prefer a small companion Worker sharing the same D1 binding unless the current adapter documentation at implementation time documents a supported custom-entrypoint composition. Upsert the wall that just ended in `Asia/Manila`; make the job idempotent.

### Phase 2 progress

| Page | Status | Visual diff (390×844 / 768×1024 / 1440×900) | DOM / behavior |
|---|---|---|---|
| Home | Pass | 0.0048% / 0.0010% / 0.0005% differing pixels (≤0.1%) | Normalized DOM matches; lightbox open/arrow/Escape and year-specific batch navigation smoke-tested |
| Wall | Pass | 0.0099% / 0.0034% / 0.0016% differing pixels (≤0.1%) | Normalized DOM matches; zoomed-out state 0.0030%, note lightbox 0.0000%; pan, note drag, pointer-open, zoom, and Escape smoke-tested |
| Create | Pass | 0.0015% / 0.0000% / 0.0000% differing pixels (≤0.1%); paper and Draw states 0.0000% | Normalized DOM matches for all eight page/editor states; 220-character limit, paper/font/sticker/anonymous/drawing controls, mock pin-to-wall flow, and lightbox smoke-tested |
| Archive | Pass | 0.0018% / 0.0000% / 0.0004% differing pixels (≤0.1%); another-day state 0.0000% | Normalized DOM matches all four states; month navigation, selected-day preview, note lightbox, and return-to-wall navigation smoke-tested |
| News | Pass | 0.0039% / 0.0000% / 0.0000% differing pixels (≤0.1%) | Normalized DOM matches; all images loaded; “Leave it on the wall” CTA navigates to Create |
| Events | Pass | 0.0020% / 0.0000% / 0.0000% differing pixels (≤0.1%); RSVP-toggled state 0.0000% | Normalized DOM matches all four states; RSVP toggle on/off smoke-tested |

Home's static content is in `src/components/HomePage.astro`; only its preview wall hydrates through `HeroWall` (`client:visible`). `NoteCard` is shared, and the layout-level `NoteLightbox` uses a nanostores atom (`client:idle`). The data module is marked `MOCK, replace before public launch` and contains the sample notes, news, events, member names, and Home preview counts/initials. The Astro dev toolbar is disabled so it cannot contaminate screenshot comparisons; it is not part of the production page.

The Freedom Wall heading and frame are static Astro markup in `src/components/WallPage.astro`; `WallBoard` is a `client:only="react"` island with its original pan, pinch, zoom, and note-drag logic.

`CreateEditor` is the `client:load` island. Until Phase 4 adds the API, created mock notes are kept in session storage and loaded onto the mock wall, preserving the original create-then-view interaction without making the sample note permanent.

The Archive heading stays static in `src/components/ArchivePage.astro`; `ArchiveCalendar` is the `client:only="react"` island because its calendar and preview depend on the current date and selected day. Archive notes remain mock data and open in the layout-level lightbox.

News is entirely static Astro markup in `src/components/NewsPage.astro`; its cards use the shared mock news dataset and the call to action routes to Create.

The Events heading and disclaimer are static Astro markup; `EventRsvp` is the `client:visible` island for the preview-only RSVP toggles.

## Current platform documentation checked

Checked the current official Astro Cloudflare integration and deployment guides and Cloudflare Wrangler configuration, Workers static-assets, and Cron Triggers documentation before selecting a deployment direction:

- Astro Cloudflare integration: <https://docs.astro.build/en/guides/integrations-guide/cloudflare/>
- Astro Cloudflare deployment: <https://docs.astro.build/en/guides/deploy/cloudflare/>
- Astro on-demand rendering: <https://docs.astro.build/en/guides/on-demand-rendering/>
- Wrangler configuration: <https://developers.cloudflare.com/workers/wrangler/configuration/>
- Workers static assets: <https://developers.cloudflare.com/workers/static-assets/binding/>
- Cron Triggers: <https://developers.cloudflare.com/workers/configuration/cron-triggers/>

The current Astro docs confirm static prerendering is the default and adapters are needed for on-demand routes. The Cloudflare deployment guide identifies the adapter server entrypoint for Wrangler; Wrangler supports a Workers `assets` configuration for static delivery, and its current docs permit assets-only Workers without `main` (not appropriate when Astro API routes need the adapter). Cron is UTC and is dispatched to `scheduled()`, not an Astro route. These details agree with the requested Workers—not Pages—target, but the Astro/cron entrypoint seam must be verified again before Phase 5.

The installed adapter enables Cloudflare Images and session KV by default. Neither is needed for this static mock-data phase, so `imageService: "passthrough"` and top-level `session: false` are configured to avoid implicitly requesting `IMAGES` or `SESSION` resources. D1 is intentionally not configured until Phase 4.

## Risks and regression checks

- **CSS cascade:** `src/index.css` contains the Google Fonts import, Tailwind import, and substantial unlayered custom CSS/overrides. Preserve every byte and order when moving it. Moving rules into a Tailwind layer or utility classes changes preflight/cascade behavior.
- **Hydration/DOM fidelity:** current app is one client-rendered React tree; Astro will create server HTML with selective islands. Keep island boundaries tight, avoid double-mounting shared state, and compare normalized `#root` markup after each port.
- **Viewport/time-dependent output:** `WallBoard` initializes zoom from `window.innerWidth`; Archive uses `Date`; the reset timer must ultimately use API `resetsAt`. Set matching time/timezone and viewport when comparing.
- **Fonts/images:** Google Fonts and Unsplash images are remote. Baseline waits for fonts and image decode; network changes or unavailable assets can produce capture noise. Do not replace fonts/assets in this migration.
- **Sticky header:** announcement must scroll away while the cream header sticks; at mobile widths scroll direction toggles `header-hidden`. Test open-menu and scroll states, preserving exact classes.
- **Static/Worker routing:** ensure prerendered paths and static assets resolve before the Worker fallback while `/api/*` is handled on demand; verify both locally and in deployed Worker previews.
- **Consent/config gaps:** quota defaults are pending. Ask and resolve them at their phase gate rather than inventing requirements.
