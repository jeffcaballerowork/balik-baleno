# Phase 8: Daily prompt, throwbacks, and pin look

**Goal:** give people a reason to post each day, and make pins feel physical.

**Steps**
1. Migration 0004: prompts (id, text, show_date unique, created_by). Admin screen to schedule prompts; the wall shows the prompt for the current Manila date, with a fallback rotation when none is scheduled.
2. "On this day" strip using the archive: same month and day in previous months and years. Hide the strip when there is no history. It will stay empty for a while; that is expected.
3. Pin look: tape and thumbtack variants, slight rotation derived from the pin id (stable across refreshes), overlap, with the existing draw tool unchanged. These are CSS and front-end changes; record a new Wall baseline with date and reason.

**Definition of done:** a scheduled prompt appears on the right Manila date and falls back correctly; the throwback strip hides when empty and shows correct notes when seeded locally; pin look is stable across refreshes.

**How the owner verifies:** seed a local prompt and local past-year pins, check the strip at the three widths, and confirm a pin keeps its rotation after a hard refresh.