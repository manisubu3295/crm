-- ─── Sprint 4: Counsellor Revenue Targets ────────────────────────────────────

CREATE TABLE counsellor_targets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month             INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year              INTEGER NOT NULL,
  revenue_target    NUMERIC(12,2) NOT NULL DEFAULT 0,
  admission_target  INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month, year)
);

CREATE INDEX idx_counsellor_targets_user ON counsellor_targets(user_id);
CREATE INDEX idx_counsellor_targets_period ON counsellor_targets(year, month);
