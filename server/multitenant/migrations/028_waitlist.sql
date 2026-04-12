-- ─── Batch Waitlist ──────────────────────────────────────────────────────────

CREATE TABLE batch_waitlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id   UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  notes      TEXT,
  notified   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (batch_id, lead_id)
);

CREATE INDEX idx_waitlist_batch ON batch_waitlist(batch_id, position);
