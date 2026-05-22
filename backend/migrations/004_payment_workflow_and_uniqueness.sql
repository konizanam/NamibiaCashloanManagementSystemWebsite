-- NCLMS migration 004
--   * Force change-of-password on first sign-in for new users.
--   * Enforce uniqueness so a microlender can't register twice.
--   * Extend the commission workflow with proof-of-payment, agent
--     confirmation/dispute, agent-initiated payment requests, and
--     reminder bookkeeping.

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------
ALTER TABLE nclms_users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- MICROLENDER UNIQUENESS
-- ---------------------------------------------------------------------------
-- Approved microlenders: NAMFISA reg no must be unique across the system.
CREATE UNIQUE INDEX IF NOT EXISTS idx_nclms_microlenders_namfisa_unique
  ON nclms_microlenders(namfisa_reg_no)
  WHERE namfisa_reg_no IS NOT NULL;

-- Applications (pending / requires_info / approved): NAMFISA reg no can only
-- be in one "live" application at a time. Rejected applications are excluded
-- so the applicant can try again after fixing things.
CREATE UNIQUE INDEX IF NOT EXISTS idx_nclms_apps_live_namfisa
  ON nclms_microlender_applications(namfisa_reg_no)
  WHERE status IN ('pending','requires_info','approved');

CREATE UNIQUE INDEX IF NOT EXISTS idx_nclms_apps_live_email
  ON nclms_microlender_applications(business_email)
  WHERE status IN ('pending','requires_info','approved');

-- ---------------------------------------------------------------------------
-- COMMISSION WORKFLOW
-- ---------------------------------------------------------------------------
ALTER TABLE nclms_agent_commissions
  ADD COLUMN IF NOT EXISTS proof_file_path        VARCHAR(500),
  ADD COLUMN IF NOT EXISTS proof_file_name        VARCHAR(500),
  ADD COLUMN IF NOT EXISTS proof_mime_type        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS proof_uploaded_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_marked_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_confirmed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_disputed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_reason         TEXT,
  ADD COLUMN IF NOT EXISTS payment_request_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_request_message TEXT,
  ADD COLUMN IF NOT EXISTS last_reminder_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count         INTEGER NOT NULL DEFAULT 0;

-- Extend status enum so we can model the new workflow.
ALTER TABLE nclms_agent_commissions
  DROP CONSTRAINT IF EXISTS nclms_agent_commissions_status_check;

ALTER TABLE nclms_agent_commissions
  ADD CONSTRAINT nclms_agent_commissions_status_check
  CHECK (status IN (
    'pending',
    'payment_requested',
    'awaiting_agent_confirmation',
    'paid',
    'disputed',
    'cancelled'
  ));

CREATE INDEX IF NOT EXISTS idx_nclms_commissions_status_reminders
  ON nclms_agent_commissions(status, last_reminder_at)
  WHERE status IN ('awaiting_agent_confirmation','payment_requested');
