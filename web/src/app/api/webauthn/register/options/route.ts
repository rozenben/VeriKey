import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import pool from '@/lib/db';
import { registrationChallengeStore } from '@/lib/challenge-store';
import { hmacEmail } from '@/lib/hash';
import { encryptEmail } from '@/lib/encrypt';

function hashOtp(code: string): string {
  const secret = process.env.IDENTIFIER_HMAC_SECRET ?? '';
  return createHmac('sha256', secret).update(code).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, display_name, otp, token } = body;

    if (!email || !display_name || !otp) {
      return NextResponse.json({ error: 'Missing email, display_name, or otp' }, { status: 400 });
    }

    const email_hash = hmacEmail(email);

    // Verify OTP before issuing WebAuthn challenge
    const code_hash = hashOtp(String(otp));
    const otpResult = await pool.query(
      `SELECT id, attempts FROM otp_codes
       WHERE email_hash = $1 AND code_hash = $2
         AND purpose = 'register' AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email_hash, code_hash]
    );
    if (otpResult.rowCount === 0) {
      await pool.query(
        `UPDATE otp_codes SET attempts = attempts + 1
         WHERE email_hash = $1 AND purpose = 'register' AND used = false AND expires_at > NOW()`,
        [email_hash]
      );
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }
    if (otpResult.rows[0].attempts >= 3) {
      return NextResponse.json({ error: 'Too many incorrect attempts. Request a new code.' }, { status: 400 });
    }

    if (token) {
      const tokenResult = await pool.query(
        `SELECT recipient_email_hash FROM verification_requests
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

    const email_encrypted = encryptEmail(email.trim().toLowerCase());
    const upsertResult = await pool.query(
      `INSERT INTO users (email_hash, display_name, email_encrypted)
       VALUES ($1, $2, $3)
       ON CONFLICT (email_hash) DO UPDATE SET display_name = EXCLUDED.display_name, email_encrypted = EXCLUDED.email_encrypted
       RETURNING id`,
      [email_hash, display_name, email_encrypted]
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
      userName: email_hash,
      userDisplayName: display_name,
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
      },
    });

    registrationChallengeStore.set(email_hash, options.challenge);

    return NextResponse.json(options);
  } catch (err) {
    console.error('[POST /api/webauthn/register/options]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
