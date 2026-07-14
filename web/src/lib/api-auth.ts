import { createHmac, randomBytes } from 'crypto';
import pool from '@/lib/db';
import { NextRequest } from 'next/server';

function hashToken(raw: string): string {
  const secret = process.env.IDENTIFIER_HMAC_SECRET ?? '';
  return createHmac('sha256', secret).update(raw).digest('hex');
}

export async function issueApiToken(userId: string): Promise<string> {
  const raw = randomBytes(32).toString('hex');
  const hashed = hashToken(raw);
  await pool.query(
    `INSERT INTO api_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [userId, hashed]
  );
  return raw;
}

export async function requireApiToken(req: NextRequest): Promise<{ userId: string } | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const raw = auth.slice(7);
  const hashed = hashToken(raw);
  const result = await pool.query(
    `SELECT user_id FROM api_tokens
     WHERE token_hash = $1 AND expires_at > NOW() AND revoked = false`,
    [hashed]
  );
  if (result.rowCount === 0) return null;
  return { userId: result.rows[0].user_id };
}
