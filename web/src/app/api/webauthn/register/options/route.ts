import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import pool from '@/lib/db';
import { registrationChallengeStore } from '@/lib/challenge-store';
import { hmacPhone } from '@/lib/phone-hash';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone_number, display_name, token } = body;

    if (!phone_number || !display_name || !token) {
      return NextResponse.json({ error: 'Missing phone_number, display_name, or token' }, { status: 400 });
    }

    const phone_number_hash = hmacPhone(phone_number);

    const tokenResult = await pool.query(
      `SELECT recipient_phone_hash FROM verification_requests
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

    const upsertResult = await pool.query(
      `INSERT INTO users (phone_number_hash, display_name)
       VALUES ($1, $2)
       ON CONFLICT (phone_number_hash) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id`,
      [phone_number_hash, display_name]
    );
    const userId: string = upsertResult.rows[0].id;

    const credResult = await pool.query(
      'SELECT credential_id FROM credentials WHERE user_id = $1',
      [userId]
    );
    const excludeCredentials = credResult.rows.map((row: { credential_id: string }) => ({
      id: row.credential_id,
      type: 'public-key' as const,
    }));

    const rpId = process.env.WEBAUTHN_RP_ID ?? 'localhost';
    const rpName = process.env.WEBAUTHN_RP_NAME ?? 'VeriKey';

    const options = await generateRegistrationOptions({
      rpID: rpId,
      rpName,
      userID: new TextEncoder().encode(userId),
      userName: phone_number_hash,
      userDisplayName: display_name,
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
      },
    });

    registrationChallengeStore.set(phone_number_hash, options.challenge);

    return NextResponse.json(options);
  } catch (err) {
    console.error('[POST /api/webauthn/register/options]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
