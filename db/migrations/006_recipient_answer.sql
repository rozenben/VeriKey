-- Migration 006: question-based verification with recipient answer

-- recipient_answer: 'yes' | 'no' — the answer to the requester's question
-- recipient_note_encrypted: optional free-text note, AES-256-GCM encrypted
-- answered_at: when the recipient submitted their answer (before biometric)
-- link_opened_at: time-lock — when the recipient first opened the link
ALTER TABLE verification_requests
  ADD COLUMN IF NOT EXISTS recipient_answer       TEXT,
  ADD COLUMN IF NOT EXISTS recipient_note_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS link_opened_at         TIMESTAMPTZ;
