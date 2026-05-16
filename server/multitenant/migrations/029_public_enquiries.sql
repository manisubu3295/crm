CREATE TABLE IF NOT EXISTS public_enquiries (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  phone       VARCHAR(20)  NOT NULL,
  email       VARCHAR(255),
  course      VARCHAR(255),
  message     TEXT,
  status      VARCHAR(50)  NOT NULL DEFAULT 'new',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_enquiries_created ON public_enquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_enquiries_status  ON public_enquiries (status);
