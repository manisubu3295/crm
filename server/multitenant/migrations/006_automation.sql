-- ─── Automation Rules ─────────────────────────────────────────
CREATE TABLE automation_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(300) NOT NULL,
  description         TEXT,
  trigger_event       VARCHAR(100) NOT NULL,
  trigger_conditions  JSONB,
  -- actions is array of: { type, channel?, templateId?, taskType?, title?, dueHours?, toUserId?, toStage? }
  actions             JSONB NOT NULL DEFAULT '[]',
  delay_minutes       INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  execution_count     INTEGER NOT NULL DEFAULT 0,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_automation_rules_trigger ON automation_rules(trigger_event) WHERE is_active = TRUE;

-- ─── Automation Execution Log ─────────────────────────────────
CREATE TABLE automation_execution_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id       UUID NOT NULL REFERENCES automation_rules(id),
  lead_id       UUID NOT NULL REFERENCES leads(id),
  triggered_at  TIMESTAMPTZ DEFAULT now(),
  actions_taken JSONB,
  status        automation_exec_status NOT NULL,
  error_message TEXT
);

CREATE INDEX idx_automation_exec_log_lead   ON automation_execution_log(lead_id);
CREATE INDEX idx_automation_exec_log_rule   ON automation_execution_log(rule_id);
CREATE INDEX idx_automation_exec_triggered  ON automation_execution_log(triggered_at DESC);

-- Seed default automation rules
INSERT INTO automation_rules (name, trigger_event, actions, delay_minutes) VALUES
  (
    'Welcome Message on New Lead',
    'lead_created',
    '[{"type":"send_message","channel":"whatsapp","triggerEvent":"lead_created"},{"type":"assign_task","taskType":"call","title":"Initial call to new lead","dueHours":1,"priority":"urgent"}]',
    0
  ),
  (
    'Follow-up Task if No Response 24h',
    'no_response_24h',
    '[{"type":"send_message","channel":"sms","triggerEvent":"no_response_24h"},{"type":"assign_task","taskType":"call","title":"Follow-up call - no response","dueHours":2,"priority":"high"}]',
    0
  ),
  (
    'Demo Reminder 24h Before',
    'demo_scheduled',
    '[{"type":"send_message","channel":"whatsapp","triggerEvent":"demo_scheduled"}]',
    0
  ),
  (
    'Payment Pending Reminder',
    'payment_pending_24h',
    '[{"type":"send_message","channel":"whatsapp","triggerEvent":"payment_pending_24h"},{"type":"escalate","message":"Payment still pending after 24h"}]',
    0
  );
