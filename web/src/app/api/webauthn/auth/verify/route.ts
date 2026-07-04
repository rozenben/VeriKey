import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import pool from '@/lib/db';
import { authChallengeStore } from '@/lib/challenge-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone_number_hash, token, auth_response } = body as {
      phone_number_hash: string;
      token: string;
      auth_response: AuthenticationResponseJSON;
    };

    if (!phone_number_hash || !token || !auth_response) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const expectedChallenge = authChallengeStore.get(phone_number_hash);
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'No challenge found. Please restart authentication.' }, { status: 400 });
    }

    const userResult = await pool.query(
      'SELECT id FROM users WHERE phone_number_hash = $1',
      [phone_number_hash]
    );
    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userId: string = userResult.rows[0].id;

    const credResult = await pool.query(
      'SELECT credential_id, public_key, counter FROM credentials WHERE user_id = $1 AND credential_id = $2',
      [userId, auth_response.id]
    );
    if (credResult.rowCount === 0) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const credRow = credResult.rows[0];
    const publicKeyBuffer = Buffer.from(credRow.public_key, 'base64');

    const rpId = process.env.WEBAUTHN_RP_ID ?? 'localhost';
    const origin = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

    const verification = await verifyAuthenticationResponse({
      response: auth_response,
      expectedChallenge,
      expectedRPID: rpId,
      expectedOrigin: origin,
      requireUserVerification: true,
      authenticator: {
        credentialID: credRow.credential_id,
        credentialPublicKey: new Uint8Array(publicKeyBuffer),
        counter: Number(credRow.counter),
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Authentication verification failed' }, { status: 400 });
    }

    authChallengeStore.delete(phone_number_hash);

    await pool.query(
      'UPDATE credentials SET counter = $1 WHERE credential_id = $2',
      [verification.authenticationInfo.newCounter, credRow.credential_id]
    );

    await pool.query(
      `UPDATE verification_requests
       SET status = 'approved', responded_at = NOW()
       WHERE token = $1 AND status = 'pending'`,
      [token]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/webauthn/auth/verify]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
