-- sprint 3: AB 2602 / SAG-AFTRA digital replica riders
CREATE TABLE IF NOT EXISTS digital_replica_contracts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES agency_workspaces(id),
  shoot_id TEXT NOT NULL,
  performer_id TEXT REFERENCES users(id),
  performer_name TEXT NOT NULL,
  performer_email TEXT NOT NULL,
  agent_email TEXT,
  union_status TEXT NOT NULL DEFAULT 'SAG-AFTRA'
    CHECK (union_status IN ('SAG-AFTRA', 'ACTRA', 'NON_UNION')),
  replica_type TEXT NOT NULL
    CHECK (replica_type IN ('VOICE_SYNTHESIS', 'VISUAL_LIKENESS', 'FULL_DIGITAL_TWIN')),
  permitted_media TEXT[] NOT NULL,
  geographic_territory TEXT[] NOT NULL,
  intended_use_description TEXT NOT NULL,
  exclusionary_clauses TEXT[] NOT NULL,
  advance_notice_given_at TIMESTAMPTZ,
  starts_at DATE NOT NULL,
  expires_at DATE NOT NULL,
  base_scale_rate_cents INT NOT NULL,
  replica_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.50,
  total_session_fee_cents INT NOT NULL,
  pension_health_cents INT NOT NULL,
  compensation_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (compensation_status IN ('PENDING', 'DISBURSED', 'VERIFIED')),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'NOTICE_SENT', 'SIGNED', 'EXPIRED', 'DISPUTED')),
  performer_signature_hash TEXT,
  signed_pdf_ref TEXT,
  typed_name TEXT,
  signer_ip TEXT,
  signer_user_agent TEXT,
  notice_token TEXT UNIQUE,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_workspace ON digital_replica_contracts (workspace_id);
CREATE INDEX IF NOT EXISTS idx_contracts_shoot ON digital_replica_contracts (shoot_id);
CREATE INDEX IF NOT EXISTS idx_contracts_expires ON digital_replica_contracts (expires_at) WHERE status = 'SIGNED';

CREATE TABLE IF NOT EXISTS contract_audit_events (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES digital_replica_contracts(id),
  event_type TEXT NOT NULL,
  actor_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_audit_contract ON contract_audit_events (contract_id, created_at);
