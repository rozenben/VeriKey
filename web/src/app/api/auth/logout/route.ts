import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireApiToken } from '@/lib/api-auth';
import { createHmac } from 'crypto';

function hashToken(raw: string): string {
  const secret = process.env.IDENTIFIER_HMAC_SECRET ?? '';
  return createHmac('sha256', secret).update(raw).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiToken(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { all } = await req.json().catch(() => ({ all: false }));

    if (all) {
      // Revoke all tokens for this user
      await pool.query(
        'UPDATE api_tokens SET revoked = true WHERE user_id = $1 AND revoked = false',
        [auth.userId]
      );
    } else {
      // Revoke only the current token
      const raw = req.headers.get('authorization')!.slice(7);
      const hashed = hashToken(raw);
      await pool.query(
        'UPDATE api_tokens SET revoked = true WHERE token_hash = $1',
        [hashed]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/auth/logout]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
