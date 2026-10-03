CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  recruit_listing_id TEXT REFERENCES recruit_listings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}',
  CHECK (num_nonnulls(job_id, recruit_listing_id) = 1)
);
INSERT INTO applications (id, user_id, job_id, recruit_listing_id, status, created_at, updated_at, data)
SELECT DISTINCT ON (data->>'userId', data->>'jobId', data->>'recruitListingId')
  id, data->>'userId', data->>'jobId', data->>'recruitListingId',
  CASE WHEN data->>'status' IN ('pending', 'accepted', 'rejected', 'withdrawn') THEN data->>'status' ELSE 'pending' END,
  created_at, updated_at, data
FROM app_entities WHERE kind = 'applications'
  AND data->>'userId' IN (SELECT id FROM users)
  AND num_nonnulls(data->>'jobId', data->>'recruitListingId') = 1
  AND (data->>'jobId' IS NULL OR data->>'jobId' IN (SELECT id FROM jobs))
  AND (data->>'recruitListingId' IS NULL OR data->>'recruitListingId' IN (SELECT id FROM recruit_listings))
ORDER BY data->>'userId', data->>'jobId', data->>'recruitListingId', updated_at DESC, id;
CREATE UNIQUE INDEX applications_job_user ON applications (job_id, user_id) WHERE job_id IS NOT NULL;
CREATE UNIQUE INDEX applications_recruit_user ON applications (recruit_listing_id, user_id) WHERE recruit_listing_id IS NOT NULL;
CREATE INDEX applications_data_gin ON applications USING GIN (data);
