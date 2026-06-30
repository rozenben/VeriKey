import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';
import pool from '@/lib/db';
import { challengeStore } from '../options/route';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone_number_hash, registration_response, token } = body as {
      phone_number_hash: string;
      registration_response: RegistrationResponseJSON;
      token: string;
    };

    if (!phone_number_hash || !registration_response || !token) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const expectedChallenge = challengeStore.get(phone_number_hash);
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'No challenge found. Please restart registration.' }, { status: 400 });
    }

    const rpId = process.env.WEBAUTHN_RP_ID ?? 'localhost';
    const origin = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

    const verification = await verifyRegistrationResponse({
      response: registration_response,
      expectedChallenge,
      expectedRPID: rpId,
      expectedOrigin: origin,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Registration verification failed' }, { status: 400 });
    }

    // Remove challenge
    challengeStore.delete(phone_number_hash);

    const { credential } = verification.registrationInfo;

    // Get user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE phone_number_hash = $1',
      [phone_number_hash]
    );
    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userId: string = userResult.rows[0].id;

    // Store credential (credential.id is base64url, publicKey is Uint8Array)
    const publicKeyB64 = Buffer.from(credential.publicKey).toString('base64');
    await pool.query(
      `INSERT INTO credentials (user_id, credential_id, public_key, counter)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (credential_id) DO UPDATE SET counter = EXCLUDED.counter`,
      [userId, credential.id, publicKeyB64, credential.counter]
    );

    // Mark verification request as approved
    await pool.query(
      `UPDATE verification_requests
       SET status = 'approved', responded_at = NOW()
       WHERE token = $1 AND status = 'pending'`,
      [token]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/webauthn/register/verify]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
