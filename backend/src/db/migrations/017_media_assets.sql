-- media_assets table (Sprint 2)
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES agency_workspaces(id),
  shoot_id TEXT REFERENCES projects(id),
  uploader_id TEXT NOT NULL REFERENCES users(id),
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  sha256_hash TEXT NOT NULL UNIQUE,
  b2_storage_key TEXT,
  b2_public_url TEXT,
  upload_state TEXT NOT NULL DEFAULT 'pending'
    CHECK (upload_state IN ('pending', 'uploaded', 'verified', 'failed')),
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ai_model_name TEXT,
  ai_model_version TEXT,
  ai_prompt_hash TEXT,
  clearance_status TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (clearance_status IN ('unreviewed', 'approved', 'rejected')),
  clearance_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_workspace ON media_assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_shoot ON media_assets(shoot_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_uploader ON media_assets(uploader_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_sha256 ON media_assets(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_media_assets_upload_state ON media_assets(upload_state);
