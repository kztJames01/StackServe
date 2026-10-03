CREATE TABLE posts (
  id TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'feed' CHECK (source_kind IN ('feed', 'posts')),
  owner_id TEXT REFERENCES users(id),
  caption TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT 'public' CHECK (audience IN ('public', 'students')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (source_kind, id)
);
INSERT INTO posts (id, source_kind, owner_id, caption, description, created_at, updated_at, data)
SELECT id, kind, COALESCE(owner_id, data->'user'->>'id'), COALESCE(data->>'caption', data->>'content', ''),
  COALESCE(data->>'description', ''), created_at, updated_at, data FROM app_entities WHERE kind IN ('feed', 'posts');
CREATE INDEX posts_data_gin ON posts USING GIN (data);
CREATE INDEX posts_audience_created ON posts (audience, created_at DESC);
CREATE INDEX posts_owner ON posts (owner_id);
