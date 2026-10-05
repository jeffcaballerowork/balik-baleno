CREATE TABLE pins (
  id TEXT PRIMARY KEY,
  wall_date TEXT NOT NULL
    CHECK (date(wall_date) IS NOT NULL AND date(wall_date) = wall_date),
  kind TEXT NOT NULL
    CHECK (kind IN ('sticky', 'torn', 'notebook', 'polaroid', 'card')),
  color TEXT
    CHECK (color IS NULL OR color IN ('yellow', 'pink', 'blue', 'green', 'mustard')),
  body TEXT NOT NULL CHECK (length(body) <= 220),
  author_name TEXT,
  font TEXT NOT NULL CHECK (font IN ('hand', 'serif')),
  ink TEXT NOT NULL,
  doodle TEXT,
  drawing_json TEXT
    CHECK (
      drawing_json IS NULL
      OR (json_valid(drawing_json) AND json_type(drawing_json) = 'array')
    ),
  image_key TEXT,
  thumb_key TEXT,
  x_pct REAL NOT NULL CHECK (x_pct BETWEEN 0 AND 100),
  y_pct REAL NOT NULL CHECK (y_pct BETWEEN 0 AND 100),
  rotation REAL NOT NULL,
  z_index INTEGER NOT NULL,
  owner_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  created_at TEXT NOT NULL,
  moved_at TEXT
) STRICT;

CREATE INDEX pins_wall_status_created
  ON pins (wall_date, status, created_at);

CREATE TABLE reactions (
  pin_id TEXT NOT NULL REFERENCES pins (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('love', 'relate', 'nostalgia')),
  voter_hash TEXT NOT NULL,
  PRIMARY KEY (pin_id, kind, voter_hash)
) STRICT, WITHOUT ROWID;

CREATE INDEX reactions_pin_kind
  ON reactions (pin_id, kind);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  pin_id TEXT NOT NULL REFERENCES pins (id) ON DELETE CASCADE,
  reporter_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX reports_pin_created
  ON reports (pin_id, created_at);

CREATE TABLE walls (
  wall_date TEXT PRIMARY KEY
    CHECK (date(wall_date) IS NOT NULL AND date(wall_date) = wall_date),
  pin_count INTEGER NOT NULL DEFAULT 0 CHECK (pin_count >= 0),
  snapshot_key TEXT,
  finalized_at TEXT
) STRICT;
