-- ─── Extended courses fields ──────────────────────────────────
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS category          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS syllabus          TEXT,
  ADD COLUMN IF NOT EXISTS certificate_offered BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sort_order        INT NOT NULL DEFAULT 0;
