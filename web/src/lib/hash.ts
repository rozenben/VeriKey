import { createHmac } from 'crypto';

export function hmacEmail(email: string): string {
  const secret = process.env.IDENTIFIER_HMAC_SECRET ?? process.env.PHONE_HMAC_SECRET;
  if (!secret) throw new Error('IDENTIFIER_HMAC_SECRET environment variable is not set');
  const normalized = email.trim().toLowerCase();
  return createHmac('sha256', secret).update(normalized).digest('hex');
}
