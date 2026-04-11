-- campaign_stats already created in 002_leads.sql
-- This migration adds the re-engagement tables

-- ─── Re-engagement Campaigns ──────────────────────────────────
CREATE TABLE reengagement_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(300) NOT NULL,
  description   TEXT,
  target_stage  VARCHAR(50),
  dormant_days  INTEGER NOT NULL,
  channel       channel NOT NULL,
  template_id   UUID REFERENCES message_templates(id),
  max_attempts  INTEGER NOT NULL DEFAULT 3,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reengagement_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID NOT NULL REFERENCES reengagement_campaigns(id),
  lead_id           UUID NOT NULL REFERENCES leads(id),
  attempt_number    INTEGER NOT NULL,
  sent_at           TIMESTAMPTZ DEFAULT now(),
  response_received BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_reengagement_log_lead    ON reengagement_log(lead_id);
CREATE INDEX idx_reengagement_log_campaign ON reengagement_log(campaign_id);

-- Seed a default re-engagement campaign
INSERT INTO reengagement_campaigns (name, description, target_stage, dormant_days, channel, max_attempts)
VALUES (
  'Cold Lead Revival',
  'Reach out to leads with no activity for 14 days in contacted/qualified stages',
  'contacted',
  14,
  'whatsapp',
  3
);
