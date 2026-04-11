-- ─── Counsellor Activity Log ─────────────────────────────────────────────────

CREATE TABLE activity_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID REFERENCES leads(id) ON DELETE SET NULL,
  user_id      UUID NOT NULL REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL,  -- call | visit | whatsapp | email | sms | meeting | demo | other
  duration_sec  INTEGER,               -- call duration in seconds
  outcome       VARCHAR(100),          -- reached | no_answer | busy | call_back | interested | not_interested
  notes         TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_logs_user_id    ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_lead_id    ON activity_logs(lead_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_type       ON activity_logs(activity_type);

-- Add calls_target to counsellor_targets
ALTER TABLE counsellor_targets ADD COLUMN IF NOT EXISTS calls_target INTEGER NOT NULL DEFAULT 0;
