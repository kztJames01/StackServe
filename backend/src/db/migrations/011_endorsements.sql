CREATE TABLE endorsements (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id),
  recipient_id TEXT NOT NULL REFERENCES users(id),
  skill TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL DEFAULT '{}',
  CHECK (author_id <> recipient_id),
  UNIQUE (author_id, recipient_id, skill)
);
INSERT INTO endorsements (id, author_id, recipient_id, skill, created_at, updated_at, data)
SELECT DISTINCT ON (data->>'authorId', data->>'recipientId', data->>'skill')
  id, data->>'authorId', data->>'recipientId', data->>'skill', created_at, updated_at, data
FROM app_entities WHERE kind = 'endorsements'
  AND data->>'authorId' IN (SELECT id FROM users)
  AND data->>'recipientId' IN (SELECT id FROM users)
  AND data->>'authorId' <> data->>'recipientId'
  AND NULLIF(data->>'skill', '') IS NOT NULL
ORDER BY data->>'authorId', data->>'recipientId', data->>'skill', updated_at DESC, id;
CREATE INDEX endorsements_data_gin ON endorsements USING GIN (data);
CREATE INDEX endorsements_recipient ON endorsements (recipient_id);
