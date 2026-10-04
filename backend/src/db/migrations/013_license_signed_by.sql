-- track who actually signed
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS signed_by TEXT;
