-- studiopass: licenses + seat counts
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  shoot_id TEXT NOT NULL,
  freelancer_id TEXT NOT NULL,
  media_ref TEXT NOT NULL,
  usage_type TEXT[] NOT NULL,
  territories TEXT[] NOT NULL,
  duration_months INT,
  starts_at DATE NOT NULL,
  expires_at DATE,
  fee_cents INT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'expired', 'disputed')),
  signed_pdf_ref TEXT,
  signed_name TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_shoot ON licenses (shoot_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry ON licenses (expires_at) WHERE status = 'signed';

CREATE TABLE IF NOT EXISTS seat_counts (
  workspace_id TEXT PRIMARY KEY,
  seats INT NOT NULL DEFAULT 3,
  stripe_subscription_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
