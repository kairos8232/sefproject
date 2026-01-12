-- Two-Factor Authentication Table
-- Ensure pgcrypto is available for gen_random_uuid()
-- Note: This requires appropriate privileges on the database.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS two_factor_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  
  -- Note: indexes are created below with CREATE INDEX (Postgres syntax)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_2fa_user_id ON two_factor_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_expires_at ON two_factor_codes (expires_at);
CREATE INDEX IF NOT EXISTS idx_2fa_code ON two_factor_codes (code);

-- Add 2FA enabled flag to users table (optional, for future use)
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
