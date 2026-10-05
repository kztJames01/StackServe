-- SAG-AFTRA rate cards (Sprint 1)
CREATE TABLE IF NOT EXISTS rate_cards (
  id TEXT PRIMARY KEY,
  job_category TEXT NOT NULL,
  union_code TEXT NOT NULL,
  scale_type TEXT NOT NULL,
  day_rate_cents INT NOT NULL,
  half_day_rate_cents INT,
  session_rate_cents INT,
  notes TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_cards_category ON rate_cards(job_category);
CREATE INDEX IF NOT EXISTS idx_rate_cards_union ON rate_cards(union_code);

-- SAG-AFTRA commercial baseline seed (idempotent)
INSERT INTO rate_cards (id, job_category, union_code, scale_type, day_rate_cents, half_day_rate_cents, session_rate_cents, notes)
VALUES
  ('sag-vo-scale', 'Voiceover', 'SAG-AFTRA', 'scale', 94900, NULL, 30700,
   'SAG-AFTRA Commercial Code - Voiceover scale day/session rate'),
  ('sag-principal-scale', 'Principal', 'SAG-AFTRA', 'scale', 104700, NULL, NULL,
   'SAG-AFTRA Commercial Code - Principal Performer day rate'),
  ('sag-background-scale', 'Background Actor', 'SAG-AFTRA', 'scale', 21200, NULL, NULL,
   'SAG-AFTRA Commercial Code - Background Performer day rate')
ON CONFLICT (id) DO NOTHING;
