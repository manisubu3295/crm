-- ─── Sprint 2: Corporate / SME Companies ─────────────────────────────────────

CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(300) NOT NULL,
  industry        VARCHAR(100),
  contact_person  VARCHAR(200),
  phone           VARCHAR(20),
  email           VARCHAR(150),
  city            VARCHAR(100),
  website         VARCHAR(300),
  gst_number      VARCHAR(30),
  notes           TEXT,
  assigned_to     UUID REFERENCES users(id),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE company_contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id     UUID REFERENCES leads(id),
  role        VARCHAR(100),
  is_primary  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE corporate_deals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                VARCHAR(300) NOT NULL,
  course_id           UUID REFERENCES courses(id),
  total_value         NUMERIC(12,2) DEFAULT 0,
  trainees_count      INTEGER DEFAULT 0,
  stage               VARCHAR(50) NOT NULL DEFAULT 'prospect',
  expected_close_date DATE,
  notes               TEXT,
  assigned_to         UUID REFERENCES users(id),
  won_at              TIMESTAMPTZ,
  lost_reason         VARCHAR(300),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_companies_name               ON companies(name);
CREATE INDEX idx_company_contacts_company_id  ON company_contacts(company_id);
CREATE INDEX idx_corporate_deals_company_id   ON corporate_deals(company_id);
CREATE INDEX idx_corporate_deals_stage        ON corporate_deals(stage);
