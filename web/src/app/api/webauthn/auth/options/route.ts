import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import pool from '@/lib/db';

// In-memory challenge store keyed by phone_number_hash.
// PRODUCTION NOTE: Replace with Redis or a DB table with TTL.
export const authChallengeStore = new Map<string, string>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone_number_hash, token } = body as {
      phone_number_hash: string;
      token: string;
    };

    if (!phone_number_hash || !token) {
      return NextResponse.json({ error: 'Missing phone_number_hash or token' }, { status: 400 });
    }

    // Validate token exists and is not expired
    const tokenResult = await pool.query(
      `SELECT id FROM verification_requests
       WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
      [token]
    );
    if (tokenResult.rowCount === 0) {
      return NextResponse.json({ error: 'Token not found or expired' }, { status: 404 });
    }

    // Look up user's credentials
    const userResult = await pool.query(
      'SELECT id FROM users WHERE phone_number_hash = $1',
      [phone_number_hash]
    );
    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: 'No credentials found for this phone number' }, { status: 404 });
    }
    const userId: string = userResult.rows[0].id;

    const credResult = await pool.query(
      'SELECT credential_id FROM credentials WHERE user_id = $1',
      [userId]
    );
    if (credResult.rowCount === 0) {
      return NextResponse.json({ error: 'No credentials found for this phone number' }, { status: 404 });
    }

    const allowCredentials = credResult.rows.map((row: { credential_id: string }) => ({
      id: row.credential_id,
      type: 'public-key' as const,
    }));

    const rpId = process.env.WEBAUTHN_RP_ID ?? 'localhost';

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials,
      userVerification: 'required',
    });

    // Store challenge
    authChallengeStore.set(phone_number_hash, options.challenge);

    return NextResponse.json(options);
  } catch (err) {
    console.error('[POST /api/webauthn/auth/options]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
