-- agency workspaces, members, invites (Sprint 1)
CREATE TABLE IF NOT EXISTS agency_workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES agency_workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'performer'
    CHECK (role IN ('admin', 'producer', 'clearance_counsel', 'performer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS workspace_invites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES agency_workspaces(id) ON DELETE CASCADE,
  invited_by TEXT NOT NULL REFERENCES users(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'performer'
    CHECK (role IN ('admin', 'producer', 'clearance_counsel', 'performer')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace ON workspace_invites(workspace_id);

-- legacy teams may not have an owner; keep the migration deterministic
INSERT INTO users (id, firebase_uid, name, roles)
VALUES ('system', 'system', 'Migrated workspace owner', ARRAY['maker'])
ON CONFLICT (id) DO NOTHING;

-- migrate existing teams entities to agency_workspaces
INSERT INTO agency_workspaces (id, name, description, owner_id, created_at, updated_at)
SELECT
  ae.id,
  COALESCE(ae.data->>'name', ae.id),
  COALESCE(ae.data->>'description', ''),
  COALESCE(ae.owner_id, 'system'),
  ae.created_at,
  ae.updated_at
FROM app_entities ae
WHERE ae.kind = 'teams'
ON CONFLICT (id) DO NOTHING;

-- seed owner as admin for migrated workspaces
INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
SELECT aw.id, aw.owner_id, 'admin', aw.created_at
FROM agency_workspaces aw
ON CONFLICT (workspace_id, user_id) DO NOTHING;
