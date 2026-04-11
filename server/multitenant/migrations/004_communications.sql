-- ─── Message Templates ────────────────────────────────────────
CREATE TABLE message_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(200) NOT NULL,
  channel          channel NOT NULL,
  trigger_event    VARCHAR(100),
  subject          VARCHAR(500),          -- email subject
  body             TEXT NOT NULL,          -- Handlebars template
  variables        JSONB,                  -- expected variable keys
  wa_template_name VARCHAR(200),           -- WhatsApp approved template name
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── Communication Logs ───────────────────────────────────────
CREATE TABLE communication_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id              UUID NOT NULL REFERENCES leads(id),
  task_id              UUID REFERENCES tasks(id),
  channel              channel NOT NULL,
  direction            comm_direction NOT NULL,
  status               comm_status NOT NULL DEFAULT 'queued',
  template_id          UUID REFERENCES message_templates(id),
  subject              VARCHAR(500),
  body                 TEXT NOT NULL,
  sent_by              UUID REFERENCES users(id),
  sent_at              TIMESTAMPTZ,
  delivered_at         TIMESTAMPTZ,
  read_at              TIMESTAMPTZ,
  external_message_id  VARCHAR(300),
  error_message        TEXT,
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comm_logs_lead_id    ON communication_logs(lead_id);
CREATE INDEX idx_comm_logs_channel    ON communication_logs(channel);
CREATE INDEX idx_comm_logs_created_at ON communication_logs(created_at DESC);
CREATE INDEX idx_comm_logs_ext_msg_id ON communication_logs(external_message_id) WHERE external_message_id IS NOT NULL;

-- Seed default message templates
INSERT INTO message_templates (name, channel, trigger_event, body, wa_template_name) VALUES
  (
    'New Lead Welcome - WhatsApp',
    'whatsapp',
    'lead_created',
    'Hi {{fullName}}, thank you for your interest in {{courseName}}! Our counsellor will contact you shortly.',
    'new_lead_welcome'
  ),
  (
    'Demo Reminder - WhatsApp',
    'whatsapp',
    'demo_scheduled',
    'Hi {{fullName}}, this is a reminder for your demo session scheduled tomorrow at {{demoTime}}. Reply YES to confirm.',
    'demo_reminder'
  ),
  (
    'Follow-Up Reminder - SMS',
    'sms',
    'no_response_24h',
    'Hi {{fullName}}, we tried to reach you regarding {{courseName}}. Please call us back at {{phone}}.',
    NULL
  ),
  (
    'Payment Pending - WhatsApp',
    'whatsapp',
    'payment_pending_24h',
    'Hi {{fullName}}, your admission for {{courseName}} is pending payment. Complete it here: {{paymentLink}}',
    'payment_pending_reminder'
  ),
  (
    'Welcome Email',
    'email',
    'lead_created',
    '<h2>Welcome to {{institutionName}}</h2><p>Dear {{fullName}},</p><p>Thank you for your enquiry about <strong>{{courseName}}</strong>. Our team will reach out to you at the earliest.</p>',
    NULL
  );
