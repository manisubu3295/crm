-- ─── Tasks ────────────────────────────────────────────────────
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id),
  opportunity_id  UUID REFERENCES opportunities(id),
  assigned_to     UUID NOT NULL REFERENCES users(id),
  task_type       task_type NOT NULL,
  title           VARCHAR(300) NOT NULL,
  description     TEXT,
  status          task_status NOT NULL DEFAULT 'pending',
  priority        task_priority NOT NULL DEFAULT 'medium',
  due_at          TIMESTAMPTZ NOT NULL,
  completed_at    TIMESTAMPTZ,
  reminder_at     TIMESTAMPTZ,
  outcome         TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_lead_id     ON tasks(lead_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_at      ON tasks(due_at);
CREATE INDEX idx_tasks_status      ON tasks(status);

-- ─── SLA Policies ─────────────────────────────────────────────
CREATE TABLE sla_policies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage                VARCHAR(50) NOT NULL,
  max_response_hours   INTEGER NOT NULL,
  escalate_to          UUID REFERENCES users(id),
  is_active            BOOLEAN NOT NULL DEFAULT TRUE
);

-- Default SLA policies per stage
INSERT INTO sla_policies (stage, max_response_hours) VALUES
  ('new', 1),
  ('contacted', 24),
  ('qualified', 48),
  ('demo', 72),
  ('interested', 48),
  ('payment', 24);

-- ─── SLA Tracking ─────────────────────────────────────────────
CREATE TABLE sla_tracking (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          UUID NOT NULL REFERENCES leads(id),
  task_id          UUID REFERENCES tasks(id),
  policy_id        UUID REFERENCES sla_policies(id),
  breached         BOOLEAN NOT NULL DEFAULT FALSE,
  breached_at      TIMESTAMPTZ,
  escalation_sent  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sla_tracking_lead ON sla_tracking(lead_id);
CREATE INDEX idx_sla_tracking_breached ON sla_tracking(breached) WHERE breached = FALSE;
