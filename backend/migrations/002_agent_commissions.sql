-- NCLMS — marketing agent commissions

CREATE TABLE IF NOT EXISTS nclms_agent_commissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES nclms_marketing_agents(id) ON DELETE CASCADE,
  microlender_id  UUID REFERENCES nclms_microlenders(id) ON DELETE SET NULL,
  application_id  UUID REFERENCES nclms_microlender_applications(id) ON DELETE SET NULL,

  -- The month this commission relates to (first day of month, UTC).
  period_month    DATE NOT NULL,

  type            VARCHAR(20) NOT NULL CHECK (type IN ('onboarding','monthly','bonus','adjustment')),

  -- Snapshots taken when the commission was created.
  tier            VARCHAR(20),
  rate_applied    NUMERIC(5,2),
  base_amount     NUMERIC(12,2),

  amount          NUMERIC(12,2) NOT NULL,
  currency        VARCHAR(3) NOT NULL DEFAULT 'NAD',

  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','cancelled')),
  paid_at         TIMESTAMPTZ,
  paid_reference  VARCHAR(255),
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclms_commissions_agent  ON nclms_agent_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_nclms_commissions_period ON nclms_agent_commissions(period_month);
CREATE INDEX IF NOT EXISTS idx_nclms_commissions_status ON nclms_agent_commissions(status);
CREATE INDEX IF NOT EXISTS idx_nclms_commissions_microlender ON nclms_agent_commissions(microlender_id);

-- A microlender produces at most one monthly commission per period.
CREATE UNIQUE INDEX IF NOT EXISTS idx_nclms_commissions_unique_monthly
  ON nclms_agent_commissions(microlender_id, period_month)
  WHERE type = 'monthly' AND microlender_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- APPLICATION MESSAGES (admin → applicant communication thread)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nclms_application_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES nclms_microlender_applications(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES nclms_users(id) ON DELETE SET NULL,
  -- Snapshot of the author's display name so the thread reads cleanly even if the user is removed.
  author_name    VARCHAR(255),
  -- 'admin_note' = admin-authored entry (may or may not be emailed),
  -- 'system'     = automated entry (status changes, etc.)
  kind           VARCHAR(20) NOT NULL DEFAULT 'admin_note'
                   CHECK (kind IN ('admin_note','system')),
  subject        VARCHAR(255),
  body           TEXT NOT NULL,
  email_sent     BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent_at  TIMESTAMPTZ,
  email_to       VARCHAR(255),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nclms_app_messages_application ON nclms_application_messages(application_id, created_at DESC);
