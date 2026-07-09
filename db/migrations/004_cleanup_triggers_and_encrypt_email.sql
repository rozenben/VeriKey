-- Migration 004: cleanup triggers, encrypt email column, drop deprecated columns

-- 1. Drop deprecated columns that are no longer read by any code path
ALTER TABLE users DROP COLUMN IF EXISTS phone_number_hash_deprecated;
ALTER TABLE verification_requests DROP COLUMN IF EXISTS recipient_phone_hash_deprecated;

-- 2. Replace plaintext email with an encrypted column.
--    The old `email` column was written but never SELECT'd, so existing rows can
--    be cleared without breaking any current functionality.
ALTER TABLE users DROP COLUMN IF EXISTS email;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_encrypted TEXT;

-- 3. Cleanup trigger for otp_codes:
--    After each new OTP is inserted for an email, delete all prior OTPs for that
--    same email that are already used or expired. Keeps the table bounded to at
--    most a handful of rows per address.
CREATE OR REPLACE FUNCTION fn_cleanup_otp_codes() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM otp_codes
  WHERE email_hash = NEW.email_hash
    AND id <> NEW.id
    AND (used = true OR expires_at < NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_otp_codes ON otp_codes;
CREATE TRIGGER trg_cleanup_otp_codes
  AFTER INSERT ON otp_codes
  FOR EACH ROW EXECUTE FUNCTION fn_cleanup_otp_codes();

-- 4. Cleanup trigger for api_tokens:
--    After each new token is issued for a user, delete all prior tokens for that
--    user that are expired or revoked.
CREATE OR REPLACE FUNCTION fn_cleanup_api_tokens() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM api_tokens
  WHERE user_id = NEW.user_id
    AND id <> NEW.id
    AND (revoked = true OR expires_at < NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_api_tokens ON api_tokens;
CREATE TRIGGER trg_cleanup_api_tokens
  AFTER INSERT ON api_tokens
  FOR EACH ROW EXECUTE FUNCTION fn_cleanup_api_tokens();
