CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES users(id),
  title TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'
);
INSERT INTO jobs (id, owner_id, title, company, description, created_at, updated_at, data)
SELECT id, owner_id, COALESCE(data->>'title', ''), COALESCE(data->>'company', ''),
  COALESCE(data->>'description', ''), created_at, updated_at, data FROM app_entities WHERE kind = 'jobs';
CREATE INDEX jobs_data_gin ON jobs USING GIN (data);
CREATE INDEX jobs_active_created ON jobs (is_active, created_at DESC);
