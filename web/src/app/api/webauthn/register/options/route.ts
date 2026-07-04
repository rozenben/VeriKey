import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import pool from '@/lib/db';
import { registrationChallengeStore } from '@/lib/challenge-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone_number_hash, display_name } = body;

    if (!phone_number_hash || !display_name) {
      return NextResponse.json({ error: 'Missing phone_number_hash or display_name' }, { status: 400 });
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
