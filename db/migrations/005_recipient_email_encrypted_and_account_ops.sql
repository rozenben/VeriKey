-- Migration 005: store encrypted recipient email, allow user deletion without losing request history

-- 1. Add encrypted recipient email to verification_requests so full history is human-readable
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS recipient_email_encrypted TEXT;

-- 2. Change requester_user_id FK to SET NULL on user deletion
--    (preserves request history rows even after account deletion)
ALTER TABLE verification_requests
  DROP CONSTRAINT IF EXISTS verification_requests_requester_user_id_fkey;

ALTER TABLE verification_requests
  ADD CONSTRAINT verification_requests_requester_user_id_fkey
    FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE SET NULL;
