-- ─── Demo / Trial Class Sessions ─────────────────────────────────────────────

CREATE TABLE demo_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  batch_id        UUID REFERENCES batches(id),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INTEGER NOT NULL DEFAULT 60,
  mode            VARCHAR(20) NOT NULL DEFAULT 'offline', -- offline | online
  location        TEXT,                                   -- room / Google Meet link
  counsellor_id   UUID REFERENCES users(id),
  trainer_id      UUID REFERENCES users(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled | completed | no_show | cancelled
  outcome         VARCHAR(30),   -- interested | not_interested | enrolled | follow_up
  notes           TEXT,
  reminder_24h_job VARCHAR(200), -- BullMQ job id for 24h reminder
  reminder_1h_job  VARCHAR(200), -- BullMQ job id for 1h reminder
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_demo_sessions_lead_id      ON demo_sessions(lead_id);
CREATE INDEX idx_demo_sessions_scheduled_at ON demo_sessions(scheduled_at);
CREATE INDEX idx_demo_sessions_status       ON demo_sessions(status);
