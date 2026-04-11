-- ─── Installment due-date tracking ──────────────────────────────────────────

CREATE TABLE payment_installments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id          UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
  lead_id          UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  installment_no   INTEGER NOT NULL DEFAULT 1,
  amount           NUMERIC(12,2) NOT NULL,
  due_date         DATE NOT NULL,
  status           VARCHAR(30) NOT NULL DEFAULT 'pending',  -- pending | paid | overdue | waived
  paid_at          TIMESTAMPTZ,
  payment_id       UUID REFERENCES payments(id),            -- linked actual payment
  reminder_sent_at TIMESTAMPTZ,                             -- last WhatsApp reminder ts
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, installment_no)
);

CREATE INDEX idx_pi_lead_id   ON payment_installments(lead_id);
CREATE INDEX idx_pi_due_date  ON payment_installments(due_date);
CREATE INDEX idx_pi_status    ON payment_installments(status);
