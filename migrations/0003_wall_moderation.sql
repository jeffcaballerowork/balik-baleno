-- Phase 7 (wall rules and moderation): additive only.
-- Existing device-owned pins stay valid; hidden defaults to visible (0).
ALTER TABLE pins ADD COLUMN user_id TEXT REFERENCES users (id);
ALTER TABLE pins ADD COLUMN edited_at TEXT;
ALTER TABLE pins ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1));

CREATE INDEX pins_user_created ON pins (user_id, created_at);
CREATE INDEX pins_hidden_wall_created ON pins (hidden, wall_date, created_at);

-- Codename: nullable until first set; uniqueness enforced case-insensitively
-- via a partial unique index so multiple NULLs stay allowed. Rate limiting
-- uses codename_updated_at (NULL means never changed yet).
ALTER TABLE users ADD COLUMN codename TEXT;
ALTER TABLE users ADD COLUMN codename_updated_at TEXT;

CREATE UNIQUE INDEX users_codename_unique ON users (codename COLLATE NOCASE) WHERE codename IS NOT NULL;

-- Moderation audit: admin_audit keeps its approval-only CHECK from 0002, so
-- moderation actions get their own additive table (no ALTER of 0002 objects).
CREATE TABLE moderation_audit (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL REFERENCES users (id),
  action TEXT NOT NULL CHECK (action IN ('pin_moved_by_admin', 'pin_restored', 'pin_deleted_by_admin', 'report_dismissed', 'pin_hidden_by_admin')),
  -- No FK on target_pin_id: the audit trail must survive pin deletion, and the
  -- delete batches insert their audit row after removing the pin in the same
  -- transaction (an FK here makes every admin/owner delete fail).
  target_pin_id TEXT,
  target_user_id TEXT REFERENCES users (id),
  details_json TEXT NOT NULL CHECK (json_valid(details_json)),
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX moderation_audit_pin_created ON moderation_audit (target_pin_id, created_at);
CREATE INDEX moderation_audit_actor_created ON moderation_audit (actor_user_id, created_at);

-- One report per reporter per pin: keeps the hide threshold counting
-- distinct reporters only.
CREATE UNIQUE INDEX reports_pin_reporter_unique ON reports (pin_id, reporter_hash);
