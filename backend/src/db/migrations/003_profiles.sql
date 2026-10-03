CREATE TABLE profiles (
  id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  student_status TEXT NOT NULL DEFAULT 'unverified' CHECK (student_status IN ('unverified', 'verified')),
  employer_status TEXT NOT NULL DEFAULT 'unverified' CHECK (employer_status IN ('unverified', 'verified')),
  university_domain TEXT,
  company_domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}',
  CHECK (handle IS NULL OR handle ~ '^[a-z0-9][a-z0-9_-]{2,29}$')
);
INSERT INTO profiles (id, name, bio, avatar, created_at, updated_at, data)
SELECT DISTINCT ON (COALESCE(data->>'userId', owner_id)) COALESCE(data->>'userId', owner_id),
  COALESCE(data->>'name', ''), COALESCE(data->>'bio', ''), COALESCE(data->>'avatar', ''), created_at, updated_at,
  data - 'id' || jsonb_build_object('id', COALESCE(data->>'userId', owner_id))
FROM app_entities WHERE kind = 'profile' AND COALESCE(data->>'userId', owner_id) IN (SELECT id FROM users)
ORDER BY COALESCE(data->>'userId', owner_id), updated_at DESC;
CREATE INDEX profiles_data_gin ON profiles USING GIN (data);
CREATE INDEX profiles_students ON profiles (university_domain) WHERE student_status = 'verified';
