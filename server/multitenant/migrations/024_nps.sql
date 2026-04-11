-- ─── NPS / Student Feedback ───────────────────────────────────────────────────

CREATE TABLE nps_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  batch_id      UUID REFERENCES batches(id) ON DELETE SET NULL,
  course_id     UUID REFERENCES courses(id) ON DELETE SET NULL,
  score         SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 10),
  category      VARCHAR(20) GENERATED ALWAYS AS (
                  CASE WHEN score >= 9 THEN 'promoter'
                       WHEN score >= 7 THEN 'passive'
                       ELSE 'detractor' END
                ) STORED,
  comment       TEXT,
  sent_at       TIMESTAMPTZ DEFAULT now(),
  responded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nps_lead_id    ON nps_responses(lead_id);
CREATE INDEX idx_nps_batch_id   ON nps_responses(batch_id);
CREATE INDEX idx_nps_course_id  ON nps_responses(course_id);
CREATE INDEX idx_nps_created_at ON nps_responses(created_at);
