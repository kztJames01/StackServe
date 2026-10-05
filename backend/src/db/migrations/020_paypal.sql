-- sprint 5: paypal paywall + payroll batches

CREATE TABLE IF NOT EXISTS paypal_subscriptions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES agency_workspaces(id),
  paypal_subscription_id TEXT UNIQUE,
  paypal_plan_id TEXT,
  status TEXT NOT NULL DEFAULT 'APPROVAL_PENDING',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paypal_subs_workspace ON paypal_subscriptions (workspace_id);

CREATE TABLE IF NOT EXISTS paypal_invoices (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES agency_workspaces(id),
  shoot_id TEXT,
  paypal_invoice_id TEXT UNIQUE,
  recipient_email TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  total_cents INT NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paypal_invoices_workspace ON paypal_invoices (workspace_id);

CREATE TABLE IF NOT EXISTS paypal_disputes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES agency_workspaces(id),
  paypal_dispute_id TEXT UNIQUE,
  reason TEXT,
  status TEXT,
  amount_cents INT,
  last_note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paypal_disputes_workspace ON paypal_disputes (workspace_id);

CREATE TABLE IF NOT EXISTS payroll_batches (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES agency_workspaces(id),
  shoot_id TEXT NOT NULL,
  export_format TEXT NOT NULL
    CHECK (export_format IN ('WRAPBOOK_CSV', 'GREENSLATE_JSON')),
  total_session_fees_cents BIGINT NOT NULL,
  total_pension_health_cents BIGINT NOT NULL,
  performer_count INT NOT NULL,
  b2_export_key TEXT,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payroll_workspace ON payroll_batches (workspace_id);
CREATE INDEX IF NOT EXISTS idx_payroll_shoot ON payroll_batches (shoot_id);
