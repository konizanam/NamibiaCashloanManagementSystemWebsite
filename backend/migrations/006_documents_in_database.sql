-- Store uploaded documents inside Postgres instead of on the local
-- filesystem. This survives Railway's ephemeral disk, makes backups
-- complete, and removes a source of file/db drift.

-- Application documents: founding statement, NAMFISA cert / approval letter,
-- principal officer ID, business registration documents, etc.
ALTER TABLE nclms_application_documents
  ADD COLUMN IF NOT EXISTS content BYTEA;

ALTER TABLE nclms_application_documents
  ALTER COLUMN file_path DROP NOT NULL;

-- Commission proof of payment.
ALTER TABLE nclms_agent_commissions
  ADD COLUMN IF NOT EXISTS proof_content BYTEA;
