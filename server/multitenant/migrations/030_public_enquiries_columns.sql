-- Adds columns that may be missing if the table was created before migration 029.
-- All ADD COLUMN IF NOT EXISTS are idempotent and safe to re-run.

ALTER TABLE public_enquiries
  ADD COLUMN IF NOT EXISTS phone   VARCHAR(20)  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS course  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS status  VARCHAR(50)  NOT NULL DEFAULT 'new';
