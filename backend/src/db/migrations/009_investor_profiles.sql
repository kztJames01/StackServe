CREATE TABLE investor_profiles (
  id TEXT PRIMARY KEY,
  owner_id TEXT UNIQUE REFERENCES users(id),
  name TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT '',
  org_domain TEXT NOT NULL DEFAULT '',
  check_size TEXT NOT NULL DEFAULT '',
  aum_range TEXT NOT NULL DEFAULT '',
  thesis TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified', 'pending', 'verified', 'rejected')),
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}'
);
INSERT INTO investor_profiles (id, owner_id, name, stage, created_at, updated_at, data)
SELECT id, owner_id, COALESCE(data->>'name', ''), COALESCE(data->>'stage', ''), created_at, updated_at,
  data - 'verified' - 'status' FROM app_entities WHERE kind = 'investors';
CREATE INDEX investor_profiles_data_gin ON investor_profiles USING GIN (data);
CREATE INDEX investor_profiles_review ON investor_profiles (status, created_at);
