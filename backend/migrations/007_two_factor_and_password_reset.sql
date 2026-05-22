-- Two-factor authentication (email OTP) and forgot-password flow state.

ALTER TABLE nclms_users
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS two_factor_code_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS two_factor_code_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS two_factor_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ;
