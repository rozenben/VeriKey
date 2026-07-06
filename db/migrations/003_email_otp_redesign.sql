-- Migration 003: Switch from phone numbers to email, add OTP, API tokens, rate limiting

-- 1. Add email columns to users (keep phone_number_hash as alias initially, then rename)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_hash TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Copy existing phone_number_hash into email_hash for backward compat
UPDATE users SET email_hash = phone_number_hash WHERE email_hash IS NULL;

-- Drop old unique constraint, add new one
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_number_hash_key;
ALTER TABLE users ADD CONSTRAINT users_email_hash_key UNIQUE (email_hash);

-- Rename column
ALTER TABLE users RENAME COLUMN phone_number_hash TO phone_number_hash_deprecated;

-- 2. Update verification_requests recipient column
ALTER TABLE verification_requests
  ADD COLUMN IF NOT EXISTS recipient_email_hash TEXT;

-- Copy existing values
UPDATE verification_requests
  SET recipient_email_hash = recipient_phone_hash
  WHERE recipient_email_hash IS NULL;

ALTER TABLE verification_requests RENAME COLUMN recipient_phone_hash TO recipient_phone_hash_deprecated;

-- 3. OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('register', 'signin')),
  attempts INT NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email_hash ON otp_codes(email_hash);

-- 4. API tokens table
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  revoked BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON api_tokens(token_hash);

-- 5. Rate limit buckets table (replaces in-memory Map)
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);
