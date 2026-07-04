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
  const digits = raw.replace(/\D/g, '');
  // Use last 9 digits so +972532421234, 0532421234, and 532421234 all hash identically.
  // Fall back to lowercased original for non-phone inputs (e.g. email).
  const normalized = digits.length >= 9 ? digits.slice(-9) : digits || raw.trim().toLowerCase();
  return createHmac('sha256', secret).update(normalized).digest('hex');
}
