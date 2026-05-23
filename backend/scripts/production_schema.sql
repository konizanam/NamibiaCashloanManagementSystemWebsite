-- NCLMS — production schema bootstrap
--
-- Single-shot SQL script that creates every table, index, and constraint the
-- NCLMS backend needs. Equivalent to applying backend/migrations/001..007
-- in order against an empty database, but without any seed / dummy data.
--
-- Usage (Railway Postgres):
--   1. Open the Postgres service in Railway → "Data" or "Connect" → grab the
--      psql connection string.
--   2. From your machine:
--        psql "<connection-string>" -f backend/scripts/production_schema.sql
--      Or paste the contents into a Postgres web console.
--   3. The runtime migrator (npm start runs `node dist/migrate.js`) will see
--      every migration listed in nclms_migrations and skip them all.
--
-- The script is idempotent: every CREATE uses IF NOT EXISTS, so re-running it
-- against the same database is safe. (It will NOT delete existing data.)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===========================================================================
-- 1. USERS
-- ===========================================================================
CREATE TABLE IF NOT EXISTS nclms_users (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                       VARCHAR(255) UNIQUE NOT NULL,
  password_hash               VARCHAR(255) NOT NULL,
  full_name                   VARCHAR(255) NOT NULL,
  phone                       VARCHAR(50),
  role                        VARCHAR(30) NOT NULL
                                CHECK (role IN ('admin','marketing_agent','microlender')),
  status                      VARCHAR(20) NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','suspended','pending')),
  last_login_at               TIMESTAMPTZ,
  must_change_password        BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_code_hash        VARCHAR(255),
  two_factor_code_expires_at  TIMESTAMPTZ,
  two_factor_attempts         INTEGER NOT NULL DEFAULT 0,
  password_reset_token_hash   VARCHAR(255),
  password_reset_expires_at   TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclms_users_role ON nclms_users(role);

-- ===========================================================================
-- 2. MARKETING AGENTS
-- ===========================================================================
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

CREATE INDEX IF NOT EXISTS idx_nclms_marketing_agents_code
  ON nclms_marketing_agents(referral_code);

-- ===========================================================================
-- 3. MICROLENDERS (approved tenants — businesses using the system)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS nclms_microlenders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID UNIQUE NOT NULL REFERENCES nclms_users(id) ON DELETE CASCADE,
  business_name        VARCHAR(255) NOT NULL,
  namfisa_reg_no       VARCHAR(100),
  business_type        VARCHAR(100),
  physical_address     TEXT,
  city                 VARCHAR(100),
  country              VARCHAR(100) NOT NULL DEFAULT 'Namibia',
  phone                VARCHAR(50),
  tier                 VARCHAR(20) NOT NULL DEFAULT 'tier1'
                         CHECK (tier IN ('tier1','tier2','tier3','tier4')),
  referred_by_agent_id UUID REFERENCES nclms_marketing_agents(id) ON DELETE SET NULL,
  application_id       UUID,  -- FK added after applications table exists.
  activated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclms_microlenders_agent
  ON nclms_microlenders(referred_by_agent_id);

-- Approved microlenders: NAMFISA reg no must be unique across the system.
CREATE UNIQUE INDEX IF NOT EXISTS idx_nclms_microlenders_namfisa_unique
  ON nclms_microlenders(namfisa_reg_no)
  WHERE namfisa_reg_no IS NOT NULL;

-- ===========================================================================
-- 4. MICROLENDER APPLICATIONS (signup awaiting admin review)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS nclms_microlender_applications (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business details
  business_name               VARCHAR(255) NOT NULL,
  namfisa_reg_no              VARCHAR(100),
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

  -- Plan + referral
  preferred_tier              VARCHAR(20)
                                CHECK (preferred_tier IN ('tier1','tier2','tier3','tier4')),
  referral_code_used          VARCHAR(20),
  referred_by_agent_id        UUID REFERENCES nclms_marketing_agents(id) ON DELETE SET NULL,

  -- Workflow
  status                      VARCHAR(30) NOT NULL DEFAULT 'pending'
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

CREATE INDEX IF NOT EXISTS idx_nclms_apps_status
  ON nclms_microlender_applications(status);
CREATE INDEX IF NOT EXISTS idx_nclms_apps_submitted
  ON nclms_microlender_applications(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_nclms_apps_agent
  ON nclms_microlender_applications(referred_by_agent_id);

-- A given NAMFISA reg / business email can only be in one live application.
CREATE UNIQUE INDEX IF NOT EXISTS idx_nclms_apps_live_namfisa
  ON nclms_microlender_applications(namfisa_reg_no)
  WHERE status IN ('pending','requires_info','approved');

CREATE UNIQUE INDEX IF NOT EXISTS idx_nclms_apps_live_email
  ON nclms_microlender_applications(business_email)
  WHERE status IN ('pending','requires_info','approved');

-- Back-reference from microlenders to the application they were approved from.
ALTER TABLE nclms_microlenders
  DROP CONSTRAINT IF EXISTS fk_nclms_microlenders_application;
ALTER TABLE nclms_microlenders
  ADD CONSTRAINT fk_nclms_microlenders_application
  FOREIGN KEY (application_id) REFERENCES nclms_microlender_applications(id)
  ON DELETE SET NULL;

-- ===========================================================================
-- 5. APPLICATION DOCUMENTS (binary blobs stored in Postgres)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS nclms_application_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES nclms_microlender_applications(id) ON DELETE CASCADE,
  document_type   VARCHAR(50) NOT NULL CHECK (document_type IN (
                    'founding_statement',
                    'namfisa_certificate',
                    'namfisa_approval_letter',
                    'principal_officer_id',
                    'business_registration',
                    'member_id',
                    'other'
                  )),
  file_name       VARCHAR(500) NOT NULL,
  file_path       VARCHAR(500), -- nullable (kept for legacy disk-stored rows)
  file_size       INT,
  mime_type       VARCHAR(100),
  content         BYTEA,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclms_app_docs_application
  ON nclms_application_documents(application_id);

-- ===========================================================================
-- 6. APPLICATION MESSAGES (admin → applicant communication thread)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS nclms_application_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES nclms_microlender_applications(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES nclms_users(id) ON DELETE SET NULL,
  author_name    VARCHAR(255),
  kind           VARCHAR(20) NOT NULL DEFAULT 'admin_note'
                   CHECK (kind IN ('admin_note','system')),
  subject        VARCHAR(255),
  body           TEXT NOT NULL,
  email_sent     BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent_at  TIMESTAMPTZ,
  email_to       VARCHAR(255),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclms_app_messages_application
  ON nclms_application_messages(application_id, created_at DESC);

-- ===========================================================================
-- 7. AUDIT LOG (system-wide activity trail)
-- ===========================================================================
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

CREATE INDEX IF NOT EXISTS idx_nclms_audit_actor
  ON nclms_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_nclms_audit_entity
  ON nclms_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_nclms_audit_created
  ON nclms_audit_log(created_at DESC);

-- ===========================================================================
-- 8. AGENT COMMISSIONS (with proof-of-payment workflow)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS nclms_agent_commissions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id                 UUID NOT NULL REFERENCES nclms_marketing_agents(id) ON DELETE CASCADE,
  microlender_id           UUID REFERENCES nclms_microlenders(id) ON DELETE SET NULL,
  application_id           UUID REFERENCES nclms_microlender_applications(id) ON DELETE SET NULL,

  period_month             DATE NOT NULL, -- first day of month

  type                     VARCHAR(20) NOT NULL
                             CHECK (type IN ('onboarding','monthly','bonus','adjustment')),

  -- Snapshots at time of creation
  tier                     VARCHAR(20),
  rate_applied             NUMERIC(5,2),
  base_amount              NUMERIC(12,2),

  amount                   NUMERIC(12,2) NOT NULL,
  currency                 VARCHAR(3) NOT NULL DEFAULT 'NAD',

  status                   VARCHAR(40) NOT NULL DEFAULT 'pending'
                             CHECK (status IN (
                               'pending',
                               'payment_requested',
                               'awaiting_agent_confirmation',
                               'paid',
                               'disputed',
                               'cancelled'
                             )),

  paid_at                  TIMESTAMPTZ,
  paid_reference           VARCHAR(255),

  -- Proof of payment (admin attaches when marking paid)
  proof_file_path          VARCHAR(500),
  proof_file_name          VARCHAR(500),
  proof_mime_type          VARCHAR(100),
  proof_uploaded_at        TIMESTAMPTZ,
  proof_content            BYTEA,

  payment_marked_at        TIMESTAMPTZ,
  agent_confirmed_at       TIMESTAMPTZ,
  agent_disputed_at        TIMESTAMPTZ,
  dispute_reason           TEXT,
  payment_request_at       TIMESTAMPTZ,
  payment_request_message  TEXT,
  last_reminder_at         TIMESTAMPTZ,
  reminder_count           INTEGER NOT NULL DEFAULT 0,

  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclms_commissions_agent
  ON nclms_agent_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_nclms_commissions_period
  ON nclms_agent_commissions(period_month);
CREATE INDEX IF NOT EXISTS idx_nclms_commissions_status
  ON nclms_agent_commissions(status);
CREATE INDEX IF NOT EXISTS idx_nclms_commissions_microlender
  ON nclms_agent_commissions(microlender_id);

-- One monthly commission row per microlender per period.
CREATE UNIQUE INDEX IF NOT EXISTS idx_nclms_commissions_unique_monthly
  ON nclms_agent_commissions(microlender_id, period_month)
  WHERE type = 'monthly' AND microlender_id IS NOT NULL;

-- Helps the reminder job scan.
CREATE INDEX IF NOT EXISTS idx_nclms_commissions_status_reminders
  ON nclms_agent_commissions(status, last_reminder_at)
  WHERE status IN ('awaiting_agent_confirmation','payment_requested');

-- ===========================================================================
-- 9. MIGRATIONS TRACKING
-- ===========================================================================
-- This table is owned by the runtime migrator (src/migrate.ts). Pre-populating
-- it with every migration filename means the runtime migrator will skip them
-- on first boot — exactly what we want when bootstrapping via this script.
CREATE TABLE IF NOT EXISTS nclms_migrations (
  filename    VARCHAR(255) PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO nclms_migrations (filename) VALUES
  ('001_init.sql'),
  ('002_agent_commissions.sql'),
  ('003_application_changes.sql'),
  ('004_payment_workflow_and_uniqueness.sql'),
  ('005_widen_status_columns.sql'),
  ('006_documents_in_database.sql'),
  ('007_two_factor_and_password_reset.sql')
ON CONFLICT (filename) DO NOTHING;

-- ===========================================================================
-- 10. BOOTSTRAP ADMIN ACCOUNT
-- ===========================================================================
-- Single admin user. Temporary password:  NclmsAdmin@2026!
-- must_change_password is TRUE so the user is forced to set a new password on
-- first sign-in. 2FA still kicks in on every login (mandatory across the app).
INSERT INTO nclms_users (
  email, password_hash, full_name, role, status, must_change_password
) VALUES (
  'ndakevakb@gmail.com',
  '$2a$12$7bAQn3RACdCVKWdP5RzQz..gzKPvSOg8t02omrSb65h9hGBGLayBW',
  'NCLMS Administrator',
  'admin',
  'active',
  TRUE
) ON CONFLICT (email) DO NOTHING;
