-- NCLMS initial schema
-- Tables are namespaced with the `nclms_` prefix.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- USERS (unified table for all roles)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nclms_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  phone         VARCHAR(50),
  role          VARCHAR(30) NOT NULL CHECK (role IN ('admin','marketing_agent','microlender')),
  status        VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclms_users_role ON nclms_users(role);

-- ---------------------------------------------------------------------------
-- MARKETING AGENTS (Koniza referrers with a unique referral code)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nclms_marketing_agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES nclms_users(id) ON DELETE CASCADE,
  referral_code   VARCHAR(20) UNIQUE NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclms_marketing_agents_code ON nclms_marketing_agents(referral_code);

-- ---------------------------------------------------------------------------
-- MICROLENDERS (approved tenants — the businesses using the system)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nclms_microlenders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID UNIQUE NOT NULL REFERENCES nclms_users(id) ON DELETE CASCADE,
  business_name        VARCHAR(255) NOT NULL,
  registration_number  VARCHAR(100),
  business_type        VARCHAR(100),
  physical_address     TEXT,
  city                 VARCHAR(100),
  country              VARCHAR(100) NOT NULL DEFAULT 'Namibia',
  phone                VARCHAR(50),
  tier                 VARCHAR(20) NOT NULL DEFAULT 'tier1' CHECK (tier IN ('tier1','tier2','tier3','tier4')),
  referred_by_agent_id UUID REFERENCES nclms_marketing_agents(id) ON DELETE SET NULL,
  application_id       UUID,
  activated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclms_microlenders_agent ON nclms_microlenders(referred_by_agent_id);

-- ---------------------------------------------------------------------------
-- MICROLENDER APPLICATIONS (public signup awaiting admin review)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nclms_microlender_applications (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business details
  business_name               VARCHAR(255) NOT NULL,
  registration_number         VARCHAR(100),
  business_type               VARCHAR(100),
  physical_address            TEXT,
  city                        VARCHAR(100),
  country                     VARCHAR(100) NOT NULL DEFAULT 'Namibia',
  business_phone              VARCHAR(50),
  business_email              VARCHAR(255) NOT NULL,

  -- Principal officer
  principal_officer_name      VARCHAR(255) NOT NULL,
  principal_officer_id_number VARCHAR(50)  NOT NULL,
  principal_officer_phone     VARCHAR(50)  NOT NULL,
  principal_officer_email     VARCHAR(255) NOT NULL,

  -- Referral
  referral_code_used          VARCHAR(20),
  referred_by_agent_id        UUID REFERENCES nclms_marketing_agents(id) ON DELETE SET NULL,

  -- Workflow
  status                      VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','approved','rejected','requires_info')),
  submitted_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at                 TIMESTAMPTZ,
  reviewed_by                 UUID REFERENCES nclms_users(id) ON DELETE SET NULL,
  rejection_reason            TEXT,
  review_notes                TEXT,
  approved_user_id            UUID REFERENCES nclms_users(id) ON DELETE SET NULL,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclms_apps_status     ON nclms_microlender_applications(status);
CREATE INDEX IF NOT EXISTS idx_nclms_apps_submitted  ON nclms_microlender_applications(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_nclms_apps_agent      ON nclms_microlender_applications(referred_by_agent_id);

-- Add the back-reference from microlenders to the original application.
ALTER TABLE nclms_microlenders
  DROP CONSTRAINT IF EXISTS fk_nclms_microlenders_application;
ALTER TABLE nclms_microlenders
  ADD CONSTRAINT fk_nclms_microlenders_application
  FOREIGN KEY (application_id) REFERENCES nclms_microlender_applications(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- APPLICATION DOCUMENTS (uploaded with each application)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nclms_application_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES nclms_microlender_applications(id) ON DELETE CASCADE,
  document_type   VARCHAR(50) NOT NULL CHECK (document_type IN (
                    'founding_statement',
                    'namfisa_certificate',
                    'namfisa_approval_letter',
                    'principal_officer_id',
                    'member_id',
                    'other'
                  )),
  file_name       VARCHAR(500) NOT NULL,
  file_path       VARCHAR(500) NOT NULL,
  file_size       INT,
  mime_type       VARCHAR(100),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclms_app_docs_application ON nclms_application_documents(application_id);

-- ---------------------------------------------------------------------------
-- AUDIT LOG (system-wide activity trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nclms_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES nclms_users(id) ON DELETE SET NULL,
  actor_role  VARCHAR(30),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   UUID,
  metadata    JSONB,
  ip_address  VARCHAR(64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclms_audit_actor   ON nclms_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_nclms_audit_entity  ON nclms_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_nclms_audit_created ON nclms_audit_log(created_at DESC);
