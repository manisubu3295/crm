-- ─── Courses ──────────────────────────────────────────────────
CREATE TABLE courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  duration    VARCHAR(50),
  fee         NUMERIC(10,2),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── Campaigns ────────────────────────────────────────────────
CREATE TABLE campaigns (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               VARCHAR(300) NOT NULL,
  source             campaign_source NOT NULL,
  meta_campaign_id   VARCHAR(200),
  meta_adset_id      VARCHAR(200),
  start_date         DATE,
  end_date           DATE,
  budget             NUMERIC(12,2),
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE campaign_stats (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         UUID NOT NULL REFERENCES campaigns(id),
  date                DATE NOT NULL,
  leads_count         INTEGER NOT NULL DEFAULT 0,
  contacted_count     INTEGER NOT NULL DEFAULT 0,
  admitted_count      INTEGER NOT NULL DEFAULT 0,
  spend               NUMERIC(12,2),
  cost_per_lead       NUMERIC(10,2),
  cost_per_admission  NUMERIC(10,2),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, date)
);

-- ─── Leads ────────────────────────────────────────────────────
CREATE TABLE leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_no               VARCHAR(30) UNIQUE,
  full_name             VARCHAR(200) NOT NULL,
  email                 VARCHAR(150),
  phone                 VARCHAR(20) NOT NULL,
  alternate_phone       VARCHAR(20),
  city                  VARCHAR(100),
  qualification         VARCHAR(100),
  course_id             UUID REFERENCES courses(id),
  source                lead_source NOT NULL,
  campaign_id           UUID REFERENCES campaigns(id),
  ad_id                 VARCHAR(200),
  form_id               VARCHAR(200),
  stage                 lead_stage NOT NULL DEFAULT 'new',
  sub_stage             VARCHAR(100),
  lead_score            INTEGER NOT NULL DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
  assigned_to           UUID REFERENCES users(id),
  is_duplicate          BOOLEAN NOT NULL DEFAULT FALSE,
  duplicate_of          UUID REFERENCES leads(id),
  lost_reason           VARCHAR(300),
  objection_notes       TEXT,
  re_engagement_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  last_contacted_at     TIMESTAMPTZ,
  admitted_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_leads_phone         ON leads(phone);
CREATE INDEX idx_leads_email         ON leads(email);
CREATE INDEX idx_leads_stage         ON leads(stage);
CREATE INDEX idx_leads_assigned_to   ON leads(assigned_to);
CREATE INDEX idx_leads_campaign_id   ON leads(campaign_id);
CREATE INDEX idx_leads_source        ON leads(source);
CREATE INDEX idx_leads_created_at    ON leads(created_at DESC);
-- Trigram index for fuzzy duplicate detection on name
CREATE INDEX idx_leads_fullname_trgm ON leads USING GIN (full_name gin_trgm_ops);

-- ─── Lead Stage History (immutable audit) ─────────────────────
CREATE TABLE lead_stage_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_stage  VARCHAR(50),
  to_stage    VARCHAR(50) NOT NULL,
  changed_by  UUID REFERENCES users(id),
  note        TEXT,
  changed_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_stage_history_lead ON lead_stage_history(lead_id);

-- ─── Lead Custom Fields ───────────────────────────────────────
CREATE TABLE lead_custom_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  field_key   VARCHAR(100) NOT NULL,
  field_value TEXT
);
CREATE INDEX idx_custom_fields_lead ON lead_custom_fields(lead_id);

-- ─── Opportunities (multi-course interest per lead) ───────────
CREATE TABLE opportunities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  course_id    UUID REFERENCES courses(id),
  stage        VARCHAR(50) NOT NULL DEFAULT 'new',
  expected_fee NUMERIC(10,2),
  probability  INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_opportunities_lead ON opportunities(lead_id);

-- Auto-increment lead_no trigger
CREATE OR REPLACE FUNCTION generate_lead_no()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  counter INTEGER;
BEGIN
  SELECT value INTO prefix FROM app_settings WHERE key = 'lead_no_prefix';
  UPDATE app_settings SET value = (value::INTEGER + 1)::TEXT
    WHERE key = 'lead_no_counter'
    RETURNING value::INTEGER INTO counter;
  NEW.lead_no := prefix || '-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(counter::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lead_no
  BEFORE INSERT ON leads
  FOR EACH ROW
  WHEN (NEW.lead_no IS NULL)
  EXECUTE FUNCTION generate_lead_no();
