-- Migration 007: WhatsApp identity foundation
--
-- Purely additive: new nullable columns and new tables only, so this is safe
-- to run ahead of any application code that reads them. No existing column is
-- renamed or dropped here (otp_codes.email_hash becomes a de facto generic
-- identifier column later, once the app code that reads/writes it is updated
-- in the same change).

-- 1. Phone identity on users, mirroring the existing email_hash / email_encrypted pattern.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_hash TEXT,
  ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_opted_in_at TIMESTAMPTZ;

ALTER TABLE users ADD CONSTRAINT users_phone_hash_key UNIQUE (phone_hash);

-- Registration may now anchor on phone alone; email_hash was already nullable
-- at the column level (see 003), this just makes "at least one identifier"
-- an enforced invariant instead of an assumption.
ALTER TABLE users ADD CONSTRAINT users_identity_required
  CHECK (email_hash IS NOT NULL OR phone_hash IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_users_phone_hash ON users(phone_hash);

-- 2. Recipient phone identity + channel tracking on verification_requests.
ALTER TABLE verification_requests
  ADD COLUMN IF NOT EXISTS recipient_phone_hash      TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone_encrypted  TEXT,
  ADD COLUMN IF NOT EXISTS intake_channel   TEXT NOT NULL DEFAULT 'web'
    CHECK (intake_channel IN ('web', 'whatsapp')),
  ADD COLUMN IF NOT EXISTS delivery_channel TEXT
    CHECK (delivery_channel IN ('email', 'whatsapp', 'whatsapp_manual_forward')),
  ADD COLUMN IF NOT EXISTS result_channel   TEXT
    CHECK (result_channel IN ('email', 'whatsapp'));

CREATE INDEX IF NOT EXISTS idx_verification_requests_recipient_phone_hash
  ON verification_requests(recipient_phone_hash);

-- 3. otp_codes: which channel a given code was actually sent over (email vs.
--    a WhatsApp session message). Existing rows are backfilled to 'email',
--    the only channel that has ever existed.
ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email', 'whatsapp'));

-- 4. WhatsApp account-linking / opt-in challenges.
--    A user taps a wa.me deep link pre-filled with a one-time code; the
--    webhook matches the inbound code back to the session that generated it.
--    Same idea as challenge-store.ts's in-memory WebAuthn challenge map, but
--    DB-backed from the start rather than repeating that known gap.
CREATE TABLE IF NOT EXISTS whatsapp_link_challenges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose      TEXT NOT NULL CHECK (purpose IN ('link_account', 'recipient_opt_in')),
  code         TEXT NOT NULL UNIQUE,
  consumed_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_link_challenges_code ON whatsapp_link_challenges(code);

-- 5. Inbound webhook delivery dedupe. Meta's Cloud API webhook can redeliver
--    the same event on timeout/retry; every inbound message id gets recorded
--    here before processing so retries are no-ops.
CREATE TABLE IF NOT EXISTS whatsapp_inbound_events (
  message_id   TEXT PRIMARY KEY,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
