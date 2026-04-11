-- Fix: sla_tracking needs a UNIQUE constraint so ON CONFLICT (lead_id, policy_id) works
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uk_sla_lead_policy'
      AND conrelid = 'sla_tracking'::regclass
  ) THEN
    ALTER TABLE sla_tracking ADD CONSTRAINT uk_sla_lead_policy UNIQUE (lead_id, policy_id);
  END IF;
END $$;
