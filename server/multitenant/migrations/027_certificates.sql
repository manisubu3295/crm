-- ─── Certificate Issuance ────────────────────────────────────────────────────

-- Add cert_no column and issued_by to enrollments
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS cert_no         VARCHAR(60),
  ADD COLUMN IF NOT EXISTS cert_issued_by  UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS cert_issued_at  TIMESTAMPTZ;

-- Unique certificate number sequence per tenant
CREATE SEQUENCE IF NOT EXISTS cert_seq START 1001;

CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_cert_no ON enrollments(cert_no)
  WHERE cert_no IS NOT NULL;
