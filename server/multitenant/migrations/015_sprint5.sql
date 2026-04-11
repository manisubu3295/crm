-- ─── Sprint 5: Quotations, Attendance, Certificates ──────────────────────────

CREATE TABLE quotations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID REFERENCES leads(id),
  company_id   UUID REFERENCES companies(id),
  quote_no     VARCHAR(50) UNIQUE,
  items        JSONB NOT NULL DEFAULT '[]',
  subtotal     NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  status       VARCHAR(30) NOT NULL DEFAULT 'draft',
  valid_until  DATE,
  notes        TEXT,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE attendance (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id  UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'present',
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(enrollment_id, date)
);

CREATE TABLE certificates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        UUID NOT NULL REFERENCES leads(id),
  enrollment_id  UUID REFERENCES enrollments(id),
  cert_no        VARCHAR(100) UNIQUE,
  course_name    VARCHAR(200) NOT NULL,
  issued_at      DATE DEFAULT CURRENT_DATE,
  dispatched_at  TIMESTAMPTZ,
  dispatch_mode  VARCHAR(50) DEFAULT 'email',
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quotations_lead_id        ON quotations(lead_id);
CREATE INDEX idx_quotations_company_id     ON quotations(company_id);
CREATE INDEX idx_attendance_enrollment_id  ON attendance(enrollment_id);
CREATE INDEX idx_attendance_date           ON attendance(date);
CREATE INDEX idx_certificates_lead_id      ON certificates(lead_id);

-- Auto-generate cert_no sequence
CREATE SEQUENCE IF NOT EXISTS cert_no_seq START 1001;
-- Auto-generate quote_no sequence
CREATE SEQUENCE IF NOT EXISTS quote_no_seq START 1001;
