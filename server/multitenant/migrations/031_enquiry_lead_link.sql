-- Links a public_enquiries row to the lead that was auto-created from it.
-- NULL means the lead creation failed or hasn't happened yet.
ALTER TABLE public_enquiries
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_public_enquiries_lead_id ON public_enquiries (lead_id);
