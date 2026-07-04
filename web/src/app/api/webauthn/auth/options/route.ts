import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import pool from '@/lib/db';
import { authChallengeStore } from '@/lib/challenge-store';
import { hmacPhone } from '@/lib/phone-hash';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone_number, token } = body as {
      phone_number: string;
      token: string;
    };

    if (!phone_number || !token) {
      return NextResponse.json({ error: 'Missing phone_number or token' }, { status: 400 });
    }

    const phone_number_hash = hmacPhone(phone_number);

    const tokenResult = await pool.query(
      `SELECT id, recipient_phone_hash FROM verification_requests
       WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
      [token]
    );
    if (tokenResult.rowCount === 0) {
      return NextResponse.json({ error: 'Token not found or expired' }, { status: 404 });
    }

    const { recipient_phone_hash } = tokenResult.rows[0];
    if (recipient_phone_hash && recipient_phone_hash !== phone_number_hash) {
      return NextResponse.json({ error: 'This link was not sent to that phone number.' }, { status: 403 });
    }

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

    authChallengeStore.set(phone_number_hash, options.challenge);

    return NextResponse.json(options);
  } catch (err) {
    console.error('[POST /api/webauthn/auth/options]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
