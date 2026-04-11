-- Enable pg_trgm for fuzzy name matching (duplicate detection)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Enums ────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin','manager','counsellor','viewer');
CREATE TYPE lead_source AS ENUM ('meta_ads','website','manual','excel_import','walk_in','phone','referral');
CREATE TYPE lead_stage AS ENUM ('new','contacted','qualified','demo','interested','payment','admitted','lost');
CREATE TYPE task_type AS ENUM ('call','whatsapp','email','sms','meeting','demo','follow_up','other');
CREATE TYPE task_status AS ENUM ('pending','in_progress','done','overdue','cancelled');
CREATE TYPE task_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE channel AS ENUM ('whatsapp','email','sms','ivr','manual_call');
CREATE TYPE comm_direction AS ENUM ('outbound','inbound');
CREATE TYPE comm_status AS ENUM ('queued','sent','delivered','read','failed','replied');
CREATE TYPE campaign_source AS ENUM ('meta_ads','google_ads','email','sms','referral','organic','other');
CREATE TYPE automation_exec_status AS ENUM ('success','failed','skipped');

-- ─── Users ────────────────────────────────────────────────────
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR(50)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name   VARCHAR(100) NOT NULL,
  email       VARCHAR(150),
  phone       VARCHAR(20),
  role        user_role NOT NULL DEFAULT 'counsellor',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── App Settings ─────────────────────────────────────────────
CREATE TABLE app_settings (
  id         SERIAL PRIMARY KEY,
  key        VARCHAR(100) UNIQUE NOT NULL,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Report Templates ─────────────────────────────────────────
CREATE TABLE report_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_key    VARCHAR(100) UNIQUE NOT NULL,
  html_template TEXT NOT NULL,
  css           TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Default admin user (password: admin123 — must be changed on first login)
INSERT INTO users (username, password_hash, full_name, role)
VALUES (
  'admin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXIG1GBjFqLS',
  'System Admin',
  'admin'
);

-- Default settings
INSERT INTO app_settings (key, value) VALUES
  ('institution_name', 'My Training Institute'),
  ('lead_no_prefix', 'CRM'),
  ('lead_no_counter', '0'),
  ('timezone', 'Asia/Kolkata'),
  ('working_hours_start', '09:00'),
  ('working_hours_end', '18:00');
