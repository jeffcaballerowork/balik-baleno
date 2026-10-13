Balik Baleno: independent alumni site for Baleno National High School. Astro + React islands + Tailwind v4 + TypeScript on Cloudflare Workers (D1; R2 later). The existing UI is the source of truth: do not change layout, colors, fonts or spacing unless asked. Header is sticky, announcement strip scrolls away. Footer always carries the unofficial-site disclaimer. One step at a time; after each change run the screenshot diff against /design/baseline and commit.

## Commands
- Dev: pnpm dev   Check: pnpm check   Build: pnpm build   Verify: pnpm verify

## How we work
- New feature: brainstorm first, then write the plan in PLAN.md and STOP for approval.
- Never say done until `pnpm verify` has run and the output is shown.
- Topic rules live in docs/rules/. Read the one that matches the task.
- Specs live in docs/specs/, one file per feature.
- Read PLAN.md only. Do not open docs/decisions/ unless the task needs it.

## Never
- Never commit or print .dev.vars or any .env file.
- Never deploy, and never run migrations on remote D1, unless told to.
- Never change dependency versions without asking.
- Never start the next phase without approval.