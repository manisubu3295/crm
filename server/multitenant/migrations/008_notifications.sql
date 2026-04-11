-- ─── In-app Notifications ────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  type        VARCHAR(80) NOT NULL,   -- 'task_overdue','sla_breach','lead_assigned','message_replied'
  title       VARCHAR(300) NOT NULL,
  body        TEXT,
  lead_id     UUID REFERENCES leads(id),
  task_id     UUID REFERENCES tasks(id),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user     ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_unread   ON notifications(user_id) WHERE is_read = FALSE;
