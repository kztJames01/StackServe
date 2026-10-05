-- sprint 4: dual-layer C2PA provenance and perceptual fingerprinting

-- add fingerprint and provenance columns to existing media_assets rows
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS perceptual_hash_visual TEXT,
  ADD COLUMN IF NOT EXISTS chromaprint_audio TEXT,
  ADD COLUMN IF NOT EXISTS ai_prompt_sanitized TEXT,
  ADD COLUMN IF NOT EXISTS exclusionary_screening_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (exclusionary_screening_status IN ('PENDING', 'PASSED', 'FLAGGED')),
  ADD COLUMN IF NOT EXISTS screening_flags JSONB,
  ADD COLUMN IF NOT EXISTS signed_asset_b2_key TEXT,
  ADD COLUMN IF NOT EXISTS jumbf_manifest_b2_key TEXT;

-- indexes for perceptual hash lookup and audio fingerprint
CREATE INDEX IF NOT EXISTS idx_media_phash ON media_assets (perceptual_hash_visual)
  WHERE perceptual_hash_visual IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_chromaprint ON media_assets (chromaprint_audio)
  WHERE chromaprint_audio IS NOT NULL;

-- provenance job tracking (retry-safe, one job per asset+contract)
CREATE TABLE IF NOT EXISTS media_provenance_jobs (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES media_assets(id),
  contract_id TEXT NOT NULL REFERENCES digital_replica_contracts(id),
  workspace_id TEXT NOT NULL REFERENCES agency_workspaces(id),
  bullmq_job_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'done', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (asset_id, contract_id)
);

CREATE INDEX IF NOT EXISTS idx_provenance_jobs_asset ON media_provenance_jobs (asset_id);
CREATE INDEX IF NOT EXISTS idx_provenance_jobs_workspace ON media_provenance_jobs (workspace_id);
CREATE INDEX IF NOT EXISTS idx_provenance_jobs_status ON media_provenance_jobs (status);

-- immutable C2PA ledger: insert-only by application convention
-- no ON DELETE CASCADE to prevent accidental data loss
CREATE TABLE IF NOT EXISTS c2pa_provenance_ledgers (
  id TEXT PRIMARY KEY,
  media_asset_id TEXT NOT NULL REFERENCES media_assets(id),
  contract_id TEXT NOT NULL REFERENCES digital_replica_contracts(id),
  provenance_job_id TEXT NOT NULL REFERENCES media_provenance_jobs(id),
  c2pa_manifest_id TEXT NOT NULL UNIQUE,
  claim_generator TEXT NOT NULL DEFAULT 'SynthPass Compliance Engine v2.1',
  signing_mode TEXT NOT NULL CHECK (signing_mode IN ('test', 'remote')),
  jumbf_manifest_key TEXT NOT NULL,
  signed_asset_key TEXT NOT NULL,
  -- public-safe assertion subset (no PII, no compensation)
  actor_consent_assertion JSONB NOT NULL,
  tamper_verified BOOLEAN NOT NULL DEFAULT TRUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (media_asset_id, contract_id)
);

CREATE INDEX IF NOT EXISTS idx_c2pa_asset ON c2pa_provenance_ledgers (media_asset_id);
CREATE INDEX IF NOT EXISTS idx_c2pa_contract ON c2pa_provenance_ledgers (contract_id);
