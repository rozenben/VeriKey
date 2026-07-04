-- Extend default link expiry from 10 minutes to 24 hours
ALTER TABLE verification_requests
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '24 hours');

-- Fix any existing pending requests that expired too quickly
UPDATE verification_requests
  SET expires_at = created_at + INTERVAL '24 hours'
  WHERE status = 'pending' AND expires_at < NOW() + INTERVAL '24 hours';
