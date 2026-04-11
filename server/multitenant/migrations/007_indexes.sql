-- ─── Additional Performance Indexes ──────────────────────────

-- Covering index for counsellor task dashboard (most common query)
CREATE INDEX idx_tasks_counsellor_dashboard
  ON tasks(assigned_to, status, due_at)
  WHERE status IN ('pending','in_progress','overdue');

-- Partial index for open SLA tracking records
CREATE INDEX idx_sla_open
  ON sla_tracking(lead_id, created_at)
  WHERE breached = FALSE AND escalation_sent = FALSE;

-- Index for re-engagement dormant lead scan
CREATE INDEX idx_leads_reengagement
  ON leads(last_contacted_at, stage, re_engagement_eligible)
  WHERE re_engagement_eligible = TRUE AND stage NOT IN ('admitted','lost');

-- Composite index for lead funnel report
CREATE INDEX idx_leads_funnel
  ON leads(stage, created_at DESC);

-- Campaign attribution index
CREATE INDEX idx_leads_campaign_admitted
  ON leads(campaign_id, admitted_at)
  WHERE admitted_at IS NOT NULL;

-- Communication log for WhatsApp delivery updates (external_message_id lookup)
CREATE INDEX idx_comm_whatsapp_ext_id
  ON communication_logs(external_message_id, channel)
  WHERE channel = 'whatsapp';
