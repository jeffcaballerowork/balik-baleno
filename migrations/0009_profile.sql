-- Phase 13.1 (alumni profiles). Additive only.
-- 0010 stays reserved for Phase 12 (donations), so the interest catalogue is
-- seeded here. This file has not been applied to remote D1 yet, so the starter
-- list below is still free to be corrected in place.

-- Profile text and the switches that decide what a visitor sees. Sensitive
-- fields default to off; listed_in_batch defaults on, matching a directory that
-- fills itself from approved accounts.
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN profession TEXT;
-- A coarse, hand-typed place ("Iloilo City"), never a coordinate. Blank means
-- hidden; the typed value is the consent, so there is no separate switch.
ALTER TABLE users ADD COLUMN based_in TEXT;
ALTER TABLE users ADD COLUMN open_to_meetups INTEGER NOT NULL DEFAULT 0 CHECK (open_to_meetups IN (0, 1));
ALTER TABLE users ADD COLUMN listed_in_batch INTEGER NOT NULL DEFAULT 1 CHECK (listed_in_batch IN (0, 1));
-- The year has its own switch, separate from birth_month/birth_day, which keep
-- using the birthday_visible column from 0005.
ALTER TABLE users ADD COLUMN birth_year INTEGER;
ALTER TABLE users ADD COLUMN birth_year_visible INTEGER NOT NULL DEFAULT 0 CHECK (birth_year_visible IN (0, 1));
ALTER TABLE users ADD COLUMN marital_status TEXT CHECK (marital_status IS NULL OR marital_status IN ('single', 'married', 'widowed', 'separated'));
ALTER TABLE users ADD COLUMN marital_visible INTEGER NOT NULL DEFAULT 0 CHECK (marital_visible IN (0, 1));
ALTER TABLE users ADD COLUMN social_facebook TEXT;
ALTER TABLE users ADD COLUMN social_instagram TEXT;
ALTER TABLE users ADD COLUMN social_tiktok TEXT;
-- R2 object keys. avatar_then_key is the batch-era photo and ships opt-in.
ALTER TABLE users ADD COLUMN avatar_key TEXT;
ALTER TABLE users ADD COLUMN avatar_then_key TEXT;
ALTER TABLE users ADD COLUMN avatar_then_visible INTEGER NOT NULL DEFAULT 0 CHECK (avatar_then_visible IN (0, 1));
ALTER TABLE users ADD COLUMN cover_key TEXT;

CREATE INDEX users_batch_listed ON users (batch_year, listed_in_batch);

-- The gallery. Cap of 6 lives in PROFILE_CONFIG, not in the schema.
CREATE TABLE user_photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  caption TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX user_photos_user_position ON user_photos (user_id, position);

-- The shared vocabulary. Slugs are stable and never reused; labels may change.
-- active = 0 retires an interest without breaking anyone who already picked it.
CREATE TABLE interests (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  group_name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE INDEX interests_group_sort ON interests (group_name, sort);

CREATE TABLE user_interests (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  slug TEXT NOT NULL REFERENCES interests (slug),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, slug)
);

CREATE INDEX user_interests_slug ON user_interests (slug);

-- A member can propose an interest; an admin approves it into the catalogue.
-- Unique per pending text so the queue cannot fill with the same idea twice.
CREATE TABLE interest_suggestions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at TEXT NOT NULL,
  reviewed_by TEXT REFERENCES users (id),
  reviewed_at TEXT
);

CREATE UNIQUE INDEX interest_suggestions_pending_unique ON interest_suggestions (lower(text)) WHERE status = 'pending';
CREATE INDEX interest_suggestions_status_created ON interest_suggestions (status, created_at);

-- Reporting, option B: a member reports a profile, an admin reads it and either
-- does nothing or suspends the account. Account-based, so not anonymous, and
-- deliberately no per-photo tool and no auto-hide by report count.
CREATE TABLE profile_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users (id),
  target_id TEXT NOT NULL REFERENCES users (id),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL,
  reviewed_by TEXT REFERENCES users (id),
  reviewed_at TEXT
);

CREATE UNIQUE INDEX profile_reports_pair_unique ON profile_reports (reporter_id, target_id);
CREATE INDEX profile_reports_status_created ON profile_reports (status, created_at);

-- admin_audit keeps its approval-only CHECK from 0002, so the new admin actions
-- get their own additive table. Same reasoning as 0003's moderation_audit.
CREATE TABLE profile_audit (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL REFERENCES users (id),
  action TEXT NOT NULL CHECK (action IN (
    'teacher_created', 'teacher_updated', 'teacher_deactivated',
    'interest_approved', 'interest_declined', 'profile_report_closed', 'photo_removed'
  )),
  target_user_id TEXT REFERENCES users (id),
  -- No FK: covers teacher ids, interest slugs and photo ids, and must survive
  -- the row it describes being deleted.
  target_id TEXT,
  details_json TEXT NOT NULL CHECK (json_valid(details_json)),
  created_at TEXT NOT NULL
);

CREATE INDEX profile_audit_actor_created ON profile_audit (actor_user_id, created_at);
CREATE INDEX profile_audit_target_created ON profile_audit (target_id, created_at);

-- Phase 14 (teacher pool admin) uses these. user_id is the hook for teacher
-- accounts later and stays unused in this build.
ALTER TABLE teachers ADD COLUMN photo_key TEXT;
ALTER TABLE teachers ADD COLUMN tenure TEXT;
ALTER TABLE teachers ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1));
ALTER TABLE teachers ADD COLUMN user_id TEXT REFERENCES users (id);

-- Starter interest catalogue: ~92 slugs in ten groups, from docs/specs/profile.md.
-- Kept off this list on purpose: religion, politics, health, money, and anything
-- used to sort people by something they cannot change.
INSERT INTO interests (slug, label, group_name, sort, active, created_at) VALUES
  ('coffee', 'Coffee', 'Around the table', 10, 1, '2026-10-17'),
  ('milk-tea', 'Milk tea', 'Around the table', 20, 1, '2026-10-17'),
  ('cooking', 'Cooking', 'Around the table', 30, 1, '2026-10-17'),
  ('baking', 'Baking', 'Around the table', 40, 1, '2026-10-17'),
  ('grilling', 'Grilling', 'Around the table', 50, 1, '2026-10-17'),
  ('street-food', 'Street food', 'Around the table', 60, 1, '2026-10-17'),
  ('kansi-batchoy', 'Kansi & batchoy', 'Around the table', 70, 1, '2026-10-17'),
  ('seafood', 'Seafood', 'Around the table', 80, 1, '2026-10-17'),
  ('desserts', 'Desserts', 'Around the table', 90, 1, '2026-10-17'),
  ('night-out', 'Night out', 'Around the table', 100, 1, '2026-10-17'),
  ('food-trips', 'Food trips', 'Around the table', 110, 1, '2026-10-17'),
  ('hiking', 'Hiking', 'Outdoors & travel', 10, 1, '2026-10-17'),
  ('camping', 'Camping', 'Outdoors & travel', 20, 1, '2026-10-17'),
  ('beach', 'Beach', 'Outdoors & travel', 30, 1, '2026-10-17'),
  ('island-hopping', 'Island hopping', 'Outdoors & travel', 40, 1, '2026-10-17'),
  ('biking', 'Biking', 'Outdoors & travel', 50, 1, '2026-10-17'),
  ('running', 'Running', 'Outdoors & travel', 60, 1, '2026-10-17'),
  ('fishing', 'Fishing', 'Outdoors & travel', 70, 1, '2026-10-17'),
  ('gardening', 'Gardening', 'Outdoors & travel', 80, 1, '2026-10-17'),
  ('plants', 'Plants', 'Outdoors & travel', 90, 1, '2026-10-17'),
  ('road-trips', 'Road trips', 'Outdoors & travel', 100, 1, '2026-10-17'),
  ('travel', 'Travel', 'Outdoors & travel', 110, 1, '2026-10-17'),
  ('basketball', 'Basketball', 'Sports & fitness', 10, 1, '2026-10-17'),
  ('volleyball', 'Volleyball', 'Sports & fitness', 20, 1, '2026-10-17'),
  ('badminton', 'Badminton', 'Sports & fitness', 30, 1, '2026-10-17'),
  ('table-tennis', 'Table tennis', 'Sports & fitness', 40, 1, '2026-10-17'),
  ('billiards', 'Billiards', 'Sports & fitness', 50, 1, '2026-10-17'),
  ('football', 'Football', 'Sports & fitness', 60, 1, '2026-10-17'),
  ('swimming', 'Swimming', 'Sports & fitness', 70, 1, '2026-10-17'),
  ('boxing', 'Boxing', 'Sports & fitness', 80, 1, '2026-10-17'),
  ('gym-lifting', 'Gym & lifting', 'Sports & fitness', 90, 1, '2026-10-17'),
  ('zumba', 'Zumba', 'Sports & fitness', 100, 1, '2026-10-17'),
  ('marathons', 'Marathons', 'Sports & fitness', 110, 1, '2026-10-17'),
  ('opm', 'OPM', 'Music & screen', 10, 1, '2026-10-17'),
  ('k-pop', 'K-pop', 'Music & screen', 20, 1, '2026-10-17'),
  ('k-drama', 'K-drama', 'Music & screen', 30, 1, '2026-10-17'),
  ('concerts', 'Concerts', 'Music & screen', 40, 1, '2026-10-17'),
  ('videoke', 'Videoke', 'Music & screen', 50, 1, '2026-10-17'),
  ('guitar', 'Guitar', 'Music & screen', 60, 1, '2026-10-17'),
  ('piano', 'Piano', 'Music & screen', 70, 1, '2026-10-17'),
  ('choir', 'Choir', 'Music & screen', 80, 1, '2026-10-17'),
  ('dancing', 'Dancing', 'Music & screen', 90, 1, '2026-10-17'),
  ('movies', 'Movies', 'Music & screen', 100, 1, '2026-10-17'),
  ('series-binge', 'Series & binge', 'Music & screen', 110, 1, '2026-10-17'),
  ('photography', 'Photography', 'Arts & making', 10, 1, '2026-10-17'),
  ('painting', 'Painting', 'Arts & making', 20, 1, '2026-10-17'),
  ('drawing', 'Drawing', 'Arts & making', 30, 1, '2026-10-17'),
  ('writing', 'Writing', 'Arts & making', 40, 1, '2026-10-17'),
  ('poetry', 'Poetry', 'Arts & making', 50, 1, '2026-10-17'),
  ('reading', 'Reading', 'Arts & making', 60, 1, '2026-10-17'),
  ('sewing', 'Sewing', 'Arts & making', 70, 1, '2026-10-17'),
  ('crochet', 'Crochet', 'Arts & making', 80, 1, '2026-10-17'),
  ('woodworking', 'Woodworking', 'Arts & making', 90, 1, '2026-10-17'),
  ('diy', 'DIY', 'Arts & making', 100, 1, '2026-10-17'),
  ('chess', 'Chess', 'Games & tech', 10, 1, '2026-10-17'),
  ('board-games', 'Board games', 'Games & tech', 20, 1, '2026-10-17'),
  ('tabletop-rpgs', 'Tabletop RPGs', 'Games & tech', 30, 1, '2026-10-17'),
  ('mobile-games', 'Mobile games', 'Games & tech', 40, 1, '2026-10-17'),
  ('pc-games', 'PC games', 'Games & tech', 50, 1, '2026-10-17'),
  ('anime', 'Anime', 'Games & tech', 60, 1, '2026-10-17'),
  ('cosplay', 'Cosplay', 'Games & tech', 70, 1, '2026-10-17'),
  ('comics-manga', 'Comics & manga', 'Games & tech', 80, 1, '2026-10-17'),
  ('coding', 'Coding', 'Games & tech', 90, 1, '2026-10-17'),
  ('tech-gadgets', 'Tech & gadgets', 'Games & tech', 100, 1, '2026-10-17'),
  ('dogs', 'Dogs', 'Animals & home', 10, 1, '2026-10-17'),
  ('cats', 'Cats', 'Animals & home', 20, 1, '2026-10-17'),
  ('aquariums', 'Aquariums', 'Animals & home', 30, 1, '2026-10-17'),
  ('birds', 'Birds', 'Animals & home', 40, 1, '2026-10-17'),
  ('interiors', 'Interiors', 'Animals & home', 50, 1, '2026-10-17'),
  ('motorcycles', 'Motorcycles', 'Animals & home', 60, 1, '2026-10-17'),
  ('cars', 'Cars', 'Animals & home', 70, 1, '2026-10-17'),
  ('reunions', 'Reunions', 'School days', 10, 1, '2026-10-17'),
  ('cat', 'CAT', 'School days', 20, 1, '2026-10-17'),
  ('yes-o', 'Yes-O', 'School days', 30, 1, '2026-10-17'),
  ('school-paper', 'School paper', 'School days', 40, 1, '2026-10-17'),
  ('drum-bugle', 'Drum & bugle', 'School days', 50, 1, '2026-10-17'),
  ('scouts', 'Scouts', 'School days', 60, 1, '2026-10-17'),
  ('cheerdance', 'Cheerdance', 'School days', 70, 1, '2026-10-17'),
  ('intramurals', 'Intramurals', 'School days', 80, 1, '2026-10-17'),
  ('field-trips', 'Field trips', 'School days', 90, 1, '2026-10-17'),
  ('teaching', 'Teaching', 'Work & study', 10, 1, '2026-10-17'),
  ('business', 'Business', 'Work & study', 20, 1, '2026-10-17'),
  ('freelancing', 'Freelancing', 'Work & study', 30, 1, '2026-10-17'),
  ('farming', 'Farming', 'Work & study', 40, 1, '2026-10-17'),
  ('engineering', 'Engineering', 'Work & study', 50, 1, '2026-10-17'),
  ('healthcare', 'Healthcare', 'Work & study', 60, 1, '2026-10-17'),
  ('government-work', 'Government work', 'Work & study', 70, 1, '2026-10-17'),
  ('further-study', 'Further study', 'Work & study', 80, 1, '2026-10-17'),
  ('volunteering', 'Volunteering', 'Life & people', 10, 1, '2026-10-17'),
  ('community-work', 'Community work', 'Life & people', 20, 1, '2026-10-17'),
  ('parenting', 'Parenting', 'Life & people', 30, 1, '2026-10-17'),
  ('mentoring', 'Mentoring', 'Life & people', 40, 1, '2026-10-17');
