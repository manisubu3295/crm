-- ─── Sprint 1: Fee & Payment Tracking ───────────────────────────────────────

CREATE TABLE payment_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  total_fee     NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  installments  INTEGER NOT NULL DEFAULT 1,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  plan_id        UUID REFERENCES payment_plans(id),
  amount         NUMERIC(12,2) NOT NULL,
  method         VARCHAR(50)  NOT NULL DEFAULT 'cash',
  status         VARCHAR(30)  NOT NULL DEFAULT 'completed',
  receipt_no     VARCHAR(100),
  installment_no INTEGER DEFAULT 1,
  notes          TEXT,
  paid_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by    UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_lead_id  ON payments(lead_id);
CREATE INDEX idx_payments_paid_at  ON payments(paid_at);
CREATE INDEX idx_payment_plans_lid ON payment_plans(lead_id);
