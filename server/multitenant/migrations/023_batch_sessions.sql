-- ─── Batch Timetable / Class Sessions ────────────────────────────────────────

CREATE TABLE batch_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id     UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun,1=Mon,...,6=Sat
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  topic        VARCHAR(300),
  trainer_id   UUID REFERENCES users(id),
  location     VARCHAR(200),   -- room / online link
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_batch_sessions_batch_id ON batch_sessions(batch_id);
