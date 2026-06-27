CREATE TABLE IF NOT EXISTS app_entities (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  owner_id TEXT,
  slug TEXT,
  team_id TEXT,
  conversation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL,
  PRIMARY KEY (kind, id)
);

CREATE INDEX IF NOT EXISTS idx_app_entities_kind_created ON app_entities (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_entities_kind_slug ON app_entities (kind, slug);
CREATE INDEX IF NOT EXISTS idx_app_entities_kind_owner ON app_entities (kind, owner_id);
CREATE INDEX IF NOT EXISTS idx_app_entities_kind_team ON app_entities (kind, team_id);
CREATE INDEX IF NOT EXISTS idx_app_entities_kind_conversation ON app_entities (kind, conversation_id);
