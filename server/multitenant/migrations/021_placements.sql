-- ─── Placement / Alumni Tracking ─────────────────────────────────────────────

CREATE TABLE placements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  enrollment_id   UUID REFERENCES enrollments(id),
  company         VARCHAR(300) NOT NULL,
  role            VARCHAR(200) NOT NULL,
  package_lpa     NUMERIC(6,2),           -- annual package in LPA (lakhs per annum)
  placement_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  mode            VARCHAR(50) DEFAULT 'campus',  -- campus | self | off_campus | referral
  location        VARCHAR(200),
  notes           TEXT,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by     UUID REFERENCES users(id),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_placements_lead_id        ON placements(lead_id);
CREATE INDEX idx_placements_placement_date ON placements(placement_date);
CREATE INDEX idx_placements_company        ON placements(company);
