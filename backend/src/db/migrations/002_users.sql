CREATE TABLE users (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT NOT NULL UNIQUE,
  email TEXT,
  name TEXT NOT NULL DEFAULT '',
  roles TEXT[] NOT NULL DEFAULT ARRAY['maker']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}',
  CHECK (roles <@ ARRAY['maker', 'employer', 'investor', 'educator']::TEXT[] AND cardinality(roles) > 0)
);
INSERT INTO users (id, firebase_uid, email, name, created_at, updated_at, data)
SELECT id, id, data->>'email', COALESCE(data->>'name', ''), created_at, updated_at, data
FROM app_entities WHERE kind = 'users';
INSERT INTO users (id, firebase_uid)
SELECT DISTINCT uid, uid FROM (
  SELECT owner_id AS uid FROM app_entities
  UNION SELECT data->>'userId' FROM app_entities
  UNION SELECT data->'user'->>'id' FROM app_entities
  UNION SELECT data->>'postedBy' FROM app_entities
  UNION SELECT data->>'authorId' FROM app_entities
  UNION SELECT data->>'recipientId' FROM app_entities
  UNION SELECT member.uid FROM app_entities CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(data->'collaborators') = 'array' THEN data->'collaborators' ELSE '[]'::jsonb END
  ) member(uid) WHERE kind = 'projects'
) identities WHERE uid IS NOT NULL AND uid <> '' ON CONFLICT DO NOTHING;
CREATE INDEX users_data_gin ON users USING GIN (data);
CREATE INDEX users_roles_gin ON users USING GIN (roles);
