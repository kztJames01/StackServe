CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES users(id),
  slug TEXT UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'
);
INSERT INTO projects (id, owner_id, slug, title, description, status, created_at, updated_at, data)
SELECT id, owner_id, slug, COALESCE(data->>'title', ''), COALESCE(data->>'description', ''),
  COALESCE(data->>'status', 'active'), created_at, updated_at, data FROM app_entities WHERE kind = 'projects';
CREATE INDEX projects_data_gin ON projects USING GIN (data);
CREATE INDEX projects_owner_created ON projects (owner_id, created_at DESC);
