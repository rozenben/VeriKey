import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import pool from '@/lib/db';
import { authChallengeStore } from '@/lib/challenge-store';
import { hmacEmail } from '@/lib/hash';
import { issueApiToken } from '@/lib/api-auth';
import { sendResultEmail } from '@/lib/verify-email';

function hashOtp(code: string): string {
  const secret = process.env.IDENTIFIER_HMAC_SECRET ?? process.env.PHONE_HMAC_SECRET ?? '';
  return createHmac('sha256', secret).update(code).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, token, otp, auth_response } = body as {
      email: string;
      token?: string;
      otp?: string;
      auth_response: AuthenticationResponseJSON;
    };

    if (!email || !auth_response) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const email_hash = hmacEmail(email);

    const expectedChallenge = authChallengeStore.get(email_hash);
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'No challenge found. Please restart authentication.' }, { status: 400 });
    }

    const userResult = await pool.query(
      'SELECT id, display_name FROM users WHERE email_hash = $1',
      [email_hash]
    );
    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userId: string = userResult.rows[0].id;
    const display_name: string = userResult.rows[0].display_name;

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

    authChallengeStore.delete(email_hash);

    await pool.query(
      'UPDATE credentials SET counter = $1 WHERE credential_id = $2',
      [verification.authenticationInfo.newCounter, credRow.credential_id]
    );

    // Mark OTP used for new-device sign-in
    if (!token && otp) {
      const code_hash = hashOtp(String(otp));
      await pool.query(
        `UPDATE otp_codes SET used = true
         WHERE id = (
           SELECT id FROM otp_codes
           WHERE email_hash = $1 AND code_hash = $2
             AND purpose = 'signin' AND used = false
           ORDER BY created_at DESC LIMIT 1
         )`,
        [email_hash, code_hash]
      );
    }

    if (token) {
      // Fetch stored answer + note before updating so we can pass them to the email
      const answerRow = await pool.query(
        `SELECT recipient_answer, recipient_note_encrypted FROM verification_requests
         WHERE token = $1 AND status = 'pending'`,
        [token]
      );
      const storedAnswer = answerRow.rows[0]?.recipient_answer ?? null;
      const storedNote = answerRow.rows[0]?.recipient_note_encrypted ?? null;

      await pool.query(
        `UPDATE verification_requests
         SET status = 'approved', responded_at = NOW()
         WHERE token = $1 AND status = 'pending'`,
        [token]
      );

      // Fire result email to requester (non-blocking)
      sendResultEmail(token, 'approved', storedAnswer, storedNote).catch(() => {});
    }

    // Issue API token for sign-in flows (not verification approvals)
    let api_token: string | undefined;
    if (!token) {
      api_token = await issueApiToken(userId);
    }

    return NextResponse.json({ success: true, display_name, api_token });
  } catch (err) {
    console.error('[POST /api/webauthn/auth/verify]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
