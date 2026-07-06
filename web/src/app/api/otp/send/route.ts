import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomInt } from 'crypto';
import pool from '@/lib/db';
import { hmacEmail } from '@/lib/hash';
import { checkRateLimit } from '@/lib/rate-limit';

function hashOtp(code: string): string {
  const secret = process.env.IDENTIFIER_HMAC_SECRET ?? process.env.PHONE_HMAC_SECRET ?? '';
  return createHmac('sha256', secret).update(code).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { email, purpose } = await req.json();

    if (!email || !['register', 'signin'].includes(purpose)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    const email_hash = hmacEmail(email);

    if (!await checkRateLimit(`otp:${email_hash}`, 5, 600_000)) {
      return NextResponse.json({ error: 'Too many OTP requests. Try again in 10 minutes.' }, { status: 429 });
    }

    // Generate 6-digit code
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const code_hash = hashOtp(code);

    await pool.query(
      `INSERT INTO otp_codes (email_hash, code_hash, purpose, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
      [email_hash, code_hash, purpose]
    );

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    const subject = 'Your VeriKey verification code';
    const bodyHtml = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem">
        <div style="text-align:center;margin-bottom:1.5rem">
          <span style="font-size:2.5rem">🔐</span>
          <h1 style="color:#1e3a8a;margin:0.5rem 0 0">VeriKey</h1>
        </div>
        <p style="font-size:1.05rem;color:#111">Your verification code is:</p>
        <div style="margin:2rem 0;text-align:center">
          <span style="font-size:2.5rem;font-weight:700;letter-spacing:0.3em;color:#1e3a8a">${code}</span>
        </div>
        <p style="font-size:0.82rem;color:#6b7280;text-align:center">
          This code is valid for 10 minutes.<br>
          If you did not request this, you can safely ignore this email.
        </p>
      </div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'VeriKey <noreply@content.verikey.com>',
        to: [email],
        subject,
        text: `Your VeriKey verification code: ${code}\n\nValid for 10 minutes.`,
        html: bodyHtml,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[otp/send] Resend error:', err);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/otp/send]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
