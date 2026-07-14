import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';
import pool from '@/lib/db';
import { registrationChallengeStore } from '@/lib/challenge-store';
import { hmacEmail } from '@/lib/hash';
import { issueApiToken } from '@/lib/api-auth';

function hashOtp(code: string): string {
  const secret = process.env.IDENTIFIER_HMAC_SECRET ?? '';
  return createHmac('sha256', secret).update(code).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, registration_response, otp, token } = body as {
      email: string;
      registration_response: RegistrationResponseJSON;
      otp: string;
      token?: string;
    };

    if (!email || !registration_response || !otp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const email_hash = hmacEmail(email);

    // Re-verify OTP atomically with registration
    const code_hash = hashOtp(String(otp));
    const otpResult = await pool.query(
      `SELECT id FROM otp_codes
       WHERE email_hash = $1 AND code_hash = $2
         AND purpose = 'register' AND used = false AND attempts < 3 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email_hash, code_hash]
    );
    if (otpResult.rowCount === 0) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    const expectedChallenge = registrationChallengeStore.get(email_hash);
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

    registrationChallengeStore.delete(email_hash);

    // Mark OTP used
    await pool.query('UPDATE otp_codes SET used = true WHERE id = $1', [otpResult.rows[0].id]);

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

    const userResult = await pool.query(
      'SELECT id FROM users WHERE email_hash = $1',
      [email_hash]
    );
    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userId: string = userResult.rows[0].id;

    const publicKeyB64 = Buffer.from(credentialPublicKey).toString('base64');
    await pool.query(
      `INSERT INTO credentials (user_id, credential_id, public_key, counter)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (credential_id) DO UPDATE SET counter = EXCLUDED.counter`,
      [userId, credentialID, publicKeyB64, counter]
    );

    if (token) {
      await pool.query(
        `UPDATE verification_requests
         SET status = 'approved', responded_at = NOW()
         WHERE token = $1 AND status = 'pending'`,
        [token]
      );
    }

    const apiToken = await issueApiToken(userId);

    return NextResponse.json({ success: true, api_token: apiToken });
  } catch (err) {
    console.error('[POST /api/webauthn/register/verify]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
