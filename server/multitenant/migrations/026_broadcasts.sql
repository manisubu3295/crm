-- ─── Bulk Broadcast Campaigns ────────────────────────────────────────────────

CREATE TABLE broadcasts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  channel       VARCHAR(20)  NOT NULL DEFAULT 'whatsapp',
  message_body  TEXT         NOT NULL,
  template_id   UUID REFERENCES message_templates(id),
  -- Segment filters stored as JSON
  filters       JSONB        NOT NULL DEFAULT '{}',
  -- Counts
  total_count   INTEGER,
  sent_count    INTEGER NOT NULL DEFAULT 0,
  failed_count  INTEGER NOT NULL DEFAULT 0,
  -- Status
  status        VARCHAR(20)  NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'queued', 'running', 'completed', 'failed')),
  scheduled_at  TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ  DEFAULT now()
);

CREATE TABLE broadcast_recipients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  phone        VARCHAR(30) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'sent', 'failed')),
  error_msg    TEXT,
  sent_at      TIMESTAMPTZ,
  UNIQUE (broadcast_id, lead_id)
);

CREATE INDEX idx_broadcast_recipients_broadcast ON broadcast_recipients(broadcast_id);
CREATE INDEX idx_broadcast_recipients_status    ON broadcast_recipients(broadcast_id, status);
