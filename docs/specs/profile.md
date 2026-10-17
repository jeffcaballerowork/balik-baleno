# Profile

Design doc for the member profile. Supersedes the thin "Phase 11: profile photos" note in
PLAN.md — this is that phase, expanded. Migration `0009` (Phase 11's reserved number).

## Why

An approved alum currently has no face and no page. The site can tell you who wrote a note
on the wall (a codename) but not who anyone *is* now, and there is no way to find a
classmate except a batch page full of mock names.

The moment this serves: an alum who's been approved opens Batch 2011 looking for someone
they lost touch with, finds them, and sees who they are today — and maybe discovers they
both still climb, and that they'd be up for coffee.

Direction, as decided: **hangout, not matchmaking.** Interests exist to find people who'd
actually do the thing with you. Not a dating pool.

## Goals (this build)

- A profile page one approved alum can visit for another: cover photo, circular avatar that
  flips to a second "then" photo, name, batch, where they're based, a short bio, profession,
  interests, socials, up to six gallery photos with captions.
- An editor at `/profile` that does all of it, including photo upload.
- Batch pages become real: approved alumni with a batch appear automatically, linking to
  their profile, with a hide toggle in the profile.
- Interests chosen from a shared catalogue by search plus a browsable shelf, with a
  "can't find it — suggest it" that goes to an admin queue.
- Admin: add/edit teachers and their card image; review interest suggestions.
- Images stored in the existing R2 bucket, served privately.

## Non-goals (deferred on purpose)

- **Teacher onboarding.** Admin curates the teacher pool and teacher card images; teachers
  do not get accounts, claim entries, or onboarding copy in this build. The schema carries
  a nullable link so nothing is rebuilt later.
- **Browse by interest / "who's up for coffee" page.** The fields it needs are collected
  now; the page is later.
- **Badges and milestones.** The profile leaves a slot for them; nothing is built.
- **Comments and suggestions page.** The interest-suggestion queue feeds it later.
- **Singles corner.** Dropped from the plan. Marital status stays as a private detail with
  no job.
- **Notes on a profile** (a wall per person). Not planned, not now.

## Anti-goals

- A profile that publishes someone's relationship status, exact location, or birth year
  without them switching it on.
- Live or precise location. No GPS, no "near you right now", ever.
- Profiles, batch member lists or gallery images visible to signed-out visitors.
- Free-text interests as the matching vocabulary — it makes "everyone who hikes"
  unfindable.
- Anything that turns this into a dating site by accident.

## Decisions (owner)

- **Layout A**: full-width cover, circular avatar overlapping its bottom-left, name and
  batch beside it, two columns below — wide column for bio and gallery, narrow column for
  the dense facts.
- **The then photo flips.** One circle; hovering (desktop) or tapping (mobile) swaps to the
  batch-era photo. Same trick as the About page's author photo. A small corner tag is the
  only hint.
- **Gallery: taped prints, max 6**, each with a short captioned line, under the bio in the
  wide column.
- **Interests: search with type-ahead**, browse groups underneath, picks pinned with a
  counter, cap of 10. A "can't find it" affordance opens an admin-reviewed suggestion.
- **Hangout direction** (above), with a single `open to meeting up` toggle, off by default.
- **Batch stays on the signup form** as the claim the admin vets at approval, and is
  editable in the profile afterwards.
- **Batch grid fills automatically on approval**, with a hide toggle in the profile.
- **Wall notes never link to a profile.** Profiles are reached only through batch pages
  (for now).
- **The codename never appears on a profile.** It is the wall's signature, visible in your
  own view only.
- **Teacher onboarding skipped**; admin curates the pool and each card gets an image.

## Calls made while writing this up (check these)

- **The `then` photo is opt-in** (`avatar_then_visible`, default off). PLAN.md's Phase 11
  note said the high-school photo stays opt-in, and this doc keeps that. Nothing depends on
  it: no then photo, or the switch off, and the picture simply does not flip.
- **The interest catalogue is a table, not code.** It has to be, because an approved
  suggestion must become a matchable interest without a deploy.
- **The display name is editable and the profile owns it.** `findOrCreateGoogleUser` must
  stop overwriting `display_name` on every sign-in (it does today, `src/lib/auth.ts`), or
  the first edit is silently lost at the next login. Google's name becomes the default at
  first sign-in only.
- **An account with no `batch_year` is listed nowhere** — no batch page, no grid row. The
  profile still works if someone has the link. A brand-new profile with nothing filled in
  is not hidden; it shows what it has and an empty state.
- **`based_in` has no visibility switch.** Owner's call: the member types it, so the typed
  value is the consent. Blank means hidden. One less toggle to explain, and one less way to
  publish a blank field.
- **Media is browser-cached only** (`Cache-Control: private`), never shared-cached: a
  signed-in-only image must not be served to a signed-out visitor by a CDN.
- **Batch stat numbers count non-hidden notes, all-time.**
- **`/admin/teachers` has no "linked member" field** in this build, and `/alumni/[id]`
  shows no Teacher badge, because nothing can set that link yet — a badge there would be
  dead UI.
- **Teacher card images change two shipped pages.** `/teachers` and `/teachers/[teacherId]`
  read `photo_key` for the card image (falling back to the initials circle they use today),
  `active = 0` hides a teacher, and `tenure` renders on the teacher page when present. Both
  pages have recorded baselines in `design/baseline/`, so those diffs are expected.

## Constraints

- Cloudflare Workers + D1. The R2 bucket is created and wired: `balik-baleno-media`, bound
  as `MEDIA` in `wrangler.jsonc`, types regenerated. The bucket stays private and images are
  served through a Worker route.
- **No image-processing binding**, so nothing server-side resizes. Photos are downscaled in
  the browser on a canvas before upload: cover ~1600px wide, avatar ~512px square, gallery
  ~1200px. This must exist in v1 or every visitor pays for someone's 6MB phone photo.
- The existing visual language is the source of truth: paper `#f6f3e9`, navy `#1b1a5f`,
  rust `#a4523e`, 1px `#dedbd0` borders, square corners, DM Sans / Fraunces / Caveat.
  Circles only for avatars. Do not invent a second visual language.
- Migration `0009`. `0010` is Phase 12 (about + donate). Do not renumber.
- Signed-in and approved is required for profiles, batch member lists and every image.
- The working tree currently holds uncommitted work unrelated to this doc (including edits
  to `src/lib/auth.ts`). Check `git status` before starting; do not sweep it into a commit.

## Data model (`0009_profile.sql`, all additive)

`users` — new columns:

- `bio` TEXT, `profession` TEXT
- `based_in` TEXT NULL (coarse, typed by hand, max ~60 chars; never a coordinate). Shown when
  it isn't blank, gone when it is: typing it *is* the opt-in, so there is no second switch to
  keep in sync.
- `open_to_meetups` INTEGER NOT NULL DEFAULT 0
- `listed_in_batch` INTEGER NOT NULL DEFAULT 1
- `birth_year` INTEGER, `birth_year_visible` INTEGER NOT NULL DEFAULT 0 (day + month and
  `birthday_visible` already exist)
- `marital_status` TEXT NULL, `marital_visible` INTEGER NOT NULL DEFAULT 0
- `social_facebook`, `social_instagram`, `social_tiktok` TEXT NULL (handle or URL)
- `avatar_key`, `avatar_then_key`, `cover_key` TEXT NULL (R2 object keys)
- `avatar_then_visible` INTEGER NOT NULL DEFAULT 0

`user_photos` — the gallery:

- `id` TEXT PRIMARY KEY, `user_id` TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  `r2_key` TEXT NOT NULL, `caption` TEXT, `position` INTEGER NOT NULL, `created_at` TEXT
  NOT NULL. Cap of 6 enforced in the API, not the schema.

`user_interests` — `user_id`, `slug`, `created_at`, PRIMARY KEY (`user_id`, `slug`). Cap of
10 enforced in the API.

`interests` — the catalogue:

- `slug` TEXT PRIMARY KEY, `label` TEXT NOT NULL, `group_name` TEXT NOT NULL, `sort`
  INTEGER NOT NULL, `active` INTEGER NOT NULL DEFAULT 1, `created_at` TEXT NOT NULL.
  Seeded in `0009` from the starter list below. Slugs are stable and never reused; labels
  can change. `active = 0` retires an interest without breaking existing rows.

`interest_suggestions` — `id`, `user_id`, `text`, `status`
(`pending` | `approved` | `declined`), `created_at`, `reviewed_by`, `reviewed_at`. Approving
one inserts a row into `interests` with a derived slug; the admin picks the group.

`profile_reports` — `id`, `reporter_id` TEXT NOT NULL REFERENCES users(id), `target_id` TEXT
NOT NULL REFERENCES users(id), `note` TEXT, `status` (`open` | `closed`), `created_at`,
`reviewed_by`, `reviewed_at`, UNIQUE (`reporter_id`, `target_id`). Reporting is account-based
and not anonymous.

`teachers` — new columns: `photo_key` TEXT NULL, `tenure` TEXT NULL (e.g. "1988–2014"),
`active` INTEGER NOT NULL DEFAULT 1, `user_id` TEXT NULL REFERENCES users(id) (unused in
this build; the hook for teacher accounts later).

## Routes and UI

- **`/profile`** (yours, signed in). Editor, in sections: photos (cover, now/then, gallery),
  about (display name, batch, based in, bio, profession), details (birthday with separate
  day/month and year switches, marital with its own switch), interests, socials, privacy
  (listed in batch, open to meetups). One save per section; CSRF on every write. Replaces
  today's codename + birthday page, which is folded in here.
- **`/alumni/[userId]`** (public to approved alumni). Layout A. Never shows the codename.
- **`/batches/[year]`** becomes on-demand instead of prerendered: real members of that batch
  who have not hidden themselves, linking to `/alumni/[id]`. The two stat numbers become
  real counts of that batch's listed members and their notes. A page that says 68 while
  showing nine is worse than saying nine.
- **`/teachers`** and **`/teachers/[teacherId]`** gain the card image and start respecting
  `active` and `tenure` (see the calls above).
- **`/admin/teachers`** (new): add, edit, deactivate a teacher; upload the card image.
- **`/admin/suggestions`** (new): the interest suggestion queue, approve or decline.
- **`/admin/approvals`** keeps showing batch + note; nothing changes there.

## API

- `GET /api/profile`, `PUT /api/profile` — own profile, Zod validated, CSRF.
- `POST /api/profile/photos` — already-downscaled image, `kind` = `cover` | `avatar` |
  `avatar_then` | `gallery`. Validates content type and a hard size cap, writes to R2 under
  `u/<userId>/<kind>-<random>.jpg`, replaces and deletes the previous object.
- `DELETE /api/profile/photos/:kind`, `DELETE /api/profile/gallery/:id`.
- `PATCH /api/profile/gallery/:id` — caption and order.
- `GET /api/interests` — the catalogue. `POST /api/interests/suggest` — one suggestion.
- `GET /api/alumni/:id` — public profile payload, or server-render the page instead; the
  builder picks.
- Media: `GET /media/<key>` streams from R2 after a session check, with
  `Cache-Control: private, max-age=…`. Browser cache only, never shared.
- Admin: `/api/admin/teachers`, `/api/admin/suggestions/[id]` (approve inserts into
  `interests`). Both write an audit row.

## Visibility rules

Visible to any signed-in, approved alum by default: display name, batch, bio, profession,
cover, avatar, gallery, interests, socials.

Off until switched on:

- `avatar_then_visible` — default off, see the calls above.
- `birth_year` — the year has its own switch, separate from the day and month, which keep
  using the existing `birthday_visible`. Showing "October 17" on the birthday strip and
  hiding "1993" is the point.
- `marital_status` — default off, and it must not filter or drive anything anywhere.
- `open_to_meetups` — default off, with a nudge in the editor so it isn't dead on arrival.
- `based_in` — no switch: a blank field shows nothing, and clearing it takes it off the
  profile. The editor labels the field "Shown on your profile".

Default on, switchable off: `listed_in_batch`.

Never visible: the codename, the email address, the Google subject.

## Moderation (v1 and its gap)

- An admin can suspend an account (`status`), which hides the profile and the batch listing.
- Interest suggestions are reviewed before they enter the catalogue, so no joke or slur
  becomes a matchable interest.
- **Reporting is B** (below), so the known gap is deliberate and written down: the admin is
  told about a profile, not about a specific photo, and cannot remove a single print.

## Starter interest catalogue (draft — owner to correct)

Grouped, around 90 slugs, so there is something concrete to react to. This is still a draft:
add what a Baleno alum would actually say, delete what's wrong, fix the groups. After launch
the catalogue grows from member suggestions.

- **Around the table:** Coffee, Milk tea, Cooking, Baking, Grilling, Street food, Kansi &
  batchoy, Seafood, Desserts, Night out, Food trips
- **Outdoors & travel:** Hiking, Camping, Beach, Island hopping, Biking, Running, Fishing,
  Gardening, Plants, Road trips, Travel
- **Sports & fitness:** Basketball, Volleyball, Badminton, Table tennis, Billiards, Football,
  Swimming, Boxing, Gym & lifting, Zumba, Marathons
- **Music & screen:** OPM, K-pop, K-drama, Concerts, Videoke, Guitar, Piano, Choir, Dancing,
  Movies, Series & binge
- **Arts & making:** Photography, Painting, Drawing, Writing, Poetry, Reading, Sewing,
  Crochet, Woodworking, DIY
- **Games & tech:** Chess, Board games, Tabletop RPGs, Mobile games, PC games, Anime,
  Cosplay, Comics & manga, Coding, Tech & gadgets
- **Animals & home:** Dogs, Cats, Aquariums, Birds, Interiors, Motorcycles, Cars
- **School days:** Reunions, CAT, Yes-O, School paper, Drum & bugle, Scouts, Cheerdance,
  Intramurals, Field trips
- **Work & study:** Teaching, Business, Freelancing, Farming, Engineering, Healthcare,
  Government work, Further study
- **Life & people:** Volunteering, Community work, Parenting, Mentoring

Kept off the list on purpose: religion, politics, health, money, and anything used to sort
people by something they can't change. If a member suggests one of those, the admin queue is
where it gets declined.

## Reporting (B, decided)

Photos get no per-photo report button in this build. What ships is the cheapest thing that
leaves a record instead of a Facebook message:

- A **"Report this profile"** link at the bottom of `/alumni/[id]`, visible to signed-in
  alumni, with one optional line for why.
- It files a row in `profile_reports` (see the data model).
- The row shows up as a second list on the existing `/admin/reports` page — same page, same
  shape as note reports. The admin reads it, opens the profile, and either does nothing or
  suspends the account (the existing `status`).
- **Honest limit:** under B the admin cannot remove a single photo. There is no per-photo
  tool, so the choices are to ask the member or to suspend the whole profile. Removing one
  print is C's job, and C is the natural upgrade if reports actually arrive.
- No auto-hiding by report count. A handful of people can bury an innocent photo by
  dogpiling, and un-burying it would be the admin's job.
- One report per reporter per target; reporting your own profile is a no-op, not an error.

Different from the note report path, which is device-token based: profile reports are
account-based, so the admin can see who reported whom. It is not anonymous.

Rejected: **A**, nothing at all — a single bad photo would cost a whole profile and nothing
would record that anyone complained.

## Related change, not this build

Post-as on the wall. The owner wants three choices at post time — real name, codename, or
anonymous — and today `/api/pins` silently signs a note with the codename when one exists.
That change belongs to the wall, not the profile, but it comes from the same conversation
and should not be lost.

## Open questions for the owner

None that block the build.

- The starter catalogue above is content, not code — correct it whenever, and the admin
  queue plus `active = 0` make late edits cheap.

Settled: reporting is **B**; `based_in` needs no visibility switch (the typed value *is* the
consent); the R2 bucket is created, bound as `MEDIA`, and verified.

## Left to the builder

Field order inside the sections, the exact Zod schemas, cache lifetimes, the R2 key layout,
empty states on a brand-new profile, and how the editor is laid out on a phone.
