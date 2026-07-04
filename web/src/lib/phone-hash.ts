import { createHmac } from 'crypto';

/**
 * Computes a server-side HMAC-SHA256 of a phone number (or email) using
 * PHONE_HMAC_SECRET. The secret never leaves the server, so an attacker
 * with only the database cannot brute-force the values even knowing the
 * full algorithm — they would also need the secret key.
 *
 * Input is normalized to digits-only for phone numbers before hashing.
 */
export function hmacPhone(raw: string): string {
  const secret = process.env.PHONE_HMAC_SECRET;
  if (!secret) throw new Error('PHONE_HMAC_SECRET environment variable is not set');
  const normalized = raw.replace(/\D/g, '') || raw.trim().toLowerCase(); // digits for phone, lowercased for email
  return createHmac('sha256', secret).update(normalized).digest('hex');
}
