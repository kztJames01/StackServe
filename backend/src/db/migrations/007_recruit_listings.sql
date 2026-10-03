CREATE TABLE recruit_listings (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES users(id),
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'
);
INSERT INTO recruit_listings (id, owner_id, project_id, title, description, created_at, updated_at, data)
SELECT id, owner_id, (SELECT p.id FROM projects p WHERE p.id = a.data->>'projectId'),
  COALESCE(data->>'title', ''), COALESCE(data->>'description', ''), created_at, updated_at, data
FROM app_entities a WHERE kind = 'recruit';
CREATE INDEX recruit_listings_data_gin ON recruit_listings USING GIN (data);
CREATE INDEX recruit_listings_owner ON recruit_listings (owner_id);
