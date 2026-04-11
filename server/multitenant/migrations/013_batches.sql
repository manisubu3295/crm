-- ─── Sprint 3: Batches & Enrollments ─────────────────────────────────────────

CREATE TABLE batches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id),
  name        VARCHAR(200) NOT NULL,
  batch_type  VARCHAR(50)  DEFAULT 'regular',
  mode        VARCHAR(30)  DEFAULT 'offline',
  timing      VARCHAR(100),
  start_date  DATE,
  end_date    DATE,
  capacity    INTEGER NOT NULL DEFAULT 30,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE enrollments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id            UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  batch_id           UUID NOT NULL REFERENCES batches(id),
  enrolled_at        TIMESTAMPTZ DEFAULT now(),
  fee_amount         NUMERIC(12,2) DEFAULT 0,
  fee_paid           NUMERIC(12,2) DEFAULT 0,
  certificate_issued BOOLEAN DEFAULT false,
  completion_date    DATE,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, batch_id)
);

CREATE INDEX idx_batches_course_id      ON batches(course_id);
CREATE INDEX idx_enrollments_lead_id    ON enrollments(lead_id);
CREATE INDEX idx_enrollments_batch_id   ON enrollments(batch_id);
