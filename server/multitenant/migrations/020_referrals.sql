-- ─── Referral tracking ───────────────────────────────────────────────────────

-- Add referred_by to leads (self-referencing: which existing lead/student referred this one)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES leads(id);
CREATE INDEX IF NOT EXISTS idx_leads_referred_by ON leads(referred_by);

-- Referral rewards log (thank-you WhatsApp + optional cash/discount reward)
CREATE TABLE IF NOT EXISTS referral_rewards (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id    UUID NOT NULL REFERENCES leads(id),   -- the person who referred
  referred_id    UUID NOT NULL REFERENCES leads(id),   -- the lead who was referred
  reward_type    VARCHAR(50) NOT NULL DEFAULT 'whatsapp_thankyou', -- whatsapp_thankyou | discount | cash
  reward_amount  NUMERIC(10,2),                        -- for cash/discount rewards
  status         VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending | sent | claimed
  sent_at        TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX idx_referral_rewards_referrer ON referral_rewards(referrer_id);
CREATE INDEX idx_referral_rewards_referred ON referral_rewards(referred_id);
