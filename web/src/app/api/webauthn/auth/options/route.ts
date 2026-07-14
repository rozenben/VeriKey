import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import pool from '@/lib/db';
import { authChallengeStore } from '@/lib/challenge-store';
import { hmacEmail } from '@/lib/hash';

function hashOtp(code: string): string {
  const secret = process.env.IDENTIFIER_HMAC_SECRET ?? '';
  return createHmac('sha256', secret).update(code).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp, token } = body as {
      email: string;
      otp?: string;
      token?: string;
    };

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const email_hash = hmacEmail(email);

    // OTP required for new-device sign-in (no token = sign-in flow, not verification approval)
    if (!token && otp) {
      const code_hash = hashOtp(String(otp));
      const otpResult = await pool.query(
        `SELECT id, attempts FROM otp_codes
         WHERE email_hash = $1 AND code_hash = $2
           AND purpose = 'signin' AND used = false AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [email_hash, code_hash]
      );
      if (otpResult.rowCount === 0) {
        await pool.query(
          `UPDATE otp_codes SET attempts = attempts + 1
           WHERE email_hash = $1 AND purpose = 'signin' AND used = false AND expires_at > NOW()`,
          [email_hash]
        );
        return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
      }
      if (otpResult.rows[0].attempts >= 3) {
        return NextResponse.json({ error: 'Too many incorrect attempts. Request a new code.' }, { status: 400 });
      }
    }

    if (token) {
      const tokenResult = await pool.query(
        `SELECT id, recipient_email_hash FROM verification_requests
         WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
        [token]
      );
      if (tokenResult.rowCount === 0) {
        return NextResponse.json({ error: 'Token not found or expired' }, { status: 404 });
      }
      const { recipient_email_hash } = tokenResult.rows[0];
      if (recipient_email_hash && recipient_email_hash !== email_hash) {
        return NextResponse.json({ error: 'This link was not sent to that email address.' }, { status: 403 });
      }
    }

    const userResult = await pool.query(
      'SELECT id FROM users WHERE email_hash = $1',
      [email_hash]
    );
    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: 'No account found for this email' }, { status: 404 });
    }
    const userId: string = userResult.rows[0].id;

    const credResult = await pool.query(
      'SELECT credential_id FROM credentials WHERE user_id = $1',
      [userId]
    );
    if (credResult.rowCount === 0) {
      return NextResponse.json({ error: 'No credentials found for this email' }, { status: 404 });
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

    authChallengeStore.set(email_hash, options.challenge);

    return NextResponse.json(options);
  } catch (err) {
    console.error('[POST /api/webauthn/auth/options]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
