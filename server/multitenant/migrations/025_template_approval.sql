-- ─── WhatsApp Template Approval Tracking ─────────────────────────────────────

ALTER TABLE message_templates
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected', 'paused')),
  ADD COLUMN IF NOT EXISTS meta_template_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS meta_template_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Existing WhatsApp templates that already have wa_template_name are likely approved
UPDATE message_templates
   SET approval_status = 'approved', approved_at = now()
 WHERE channel = 'whatsapp' AND wa_template_name IS NOT NULL;

COMMENT ON COLUMN message_templates.approval_status IS 'draft|pending|approved|rejected|paused — mirrors Meta template status';
COMMENT ON COLUMN message_templates.meta_template_id IS 'Meta template ID returned by Graph API';
COMMENT ON COLUMN message_templates.meta_template_name IS 'snake_case name submitted to Meta (immutable once approved)';
