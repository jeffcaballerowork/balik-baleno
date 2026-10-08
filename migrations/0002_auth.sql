CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_subject TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'alum'
    CHECK (role IN ('super_admin', 'admin', 'alum')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined', 'suspended')),
  batch_year INTEGER,
  join_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX users_status_created ON users (status, created_at);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
) STRICT;

CREATE INDEX sessions_user_expiry ON sessions (user_id, expires_at);

CREATE TABLE admin_audit (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL REFERENCES users (id),
  action TEXT NOT NULL CHECK (action IN ('user_approved', 'user_declined')),
  target_user_id TEXT NOT NULL REFERENCES users (id),
  details_json TEXT NOT NULL CHECK (json_valid(details_json)),
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX admin_audit_target_created ON admin_audit (target_user_id, created_at);
