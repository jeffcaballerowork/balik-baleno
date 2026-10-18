# Balik Baleno
Independent (unofficial) alumni site for Baleno National High School. Astro + React islands + Tailwind v4 + TypeScript on Cloudflare Workers (D1; R2 later).

## Commands
- Dev: pnpm dev   Check: pnpm check   Build: pnpm build   Verify: pnpm verify

## Where to start (pick by task type)
- New feature or change: start at step 1.
- Bug, error or "fix this" (with or without a screenshot): skip steps 1 and 2. Use `systematic-debugging` and state the root cause before editing code. Then fix and go to step 5.
- If a fix needs a design decision or touches more than a few files, stop and switch to steps 1 and 2.
- Tiny tweaks (typo, copy, one-line fix): make the change and run `pnpm verify`.

## Lifecycle (one step at a time)
1. Define: `brainstorming`. Ask questions, write no code.
2. Plan: `writing-plans`. Write phases into PLAN.md, then STOP for approval.
3. Build: `test-driven-development`. Failing test first for logic (API routes, D1 queries, utils). UI is covered by the screenshot diff.
4. Debug: `systematic-debugging` whenever something breaks.
5. Verify: `verification-before-completion`. Run `pnpm verify` and the screenshot diff against /design/baseline, and show the output.
6. Review and ship: docs/rules/release-checklist.md, commit, then ask before the next task. Never deploy unless told to.

## UI rules
- The existing UI is the source of truth. Do not change layout, colors, fonts or spacing unless asked. Bug fixes must not change the UI beyond the bug.
- Header is sticky, announcement strip scrolls away.
- Footer always carries the unofficial-site disclaimer.

## Docs
- Specs live in docs/specs/, one file per feature.
- Topic rules live in docs/rules/. Read the one that matches the task.
- Read PLAN.md first. Open docs/decisions/ only if the task needs it.

## Never
- Never say "done" until `pnpm verify` has run and the output is shown.
- Never commit or print .dev.vars or any .env file.
- Never deploy, and never run migrations on remote D1, unless told to.
- Never change dependency versions without asking.
- Never start the next phase without approval.