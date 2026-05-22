-- Widen status columns so the longer values added in migration 004
-- (awaiting_agent_confirmation, payment_requested) fit. VARCHAR(20)
-- was inherited from migration 001 and is too tight.

ALTER TABLE nclms_agent_commissions
  ALTER COLUMN status TYPE VARCHAR(40);

-- Defensive: ensure application status can hold its longest member
-- ("requires_info" is 13, fits in 20, but bump to 30 to match other tables).
ALTER TABLE nclms_microlender_applications
  ALTER COLUMN status TYPE VARCHAR(30);
