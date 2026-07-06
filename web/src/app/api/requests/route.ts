import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import pool from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { hmacEmail } from '@/lib/hash';
import { requireApiToken } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiToken(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { recipient_email, message_text, purpose } = body;

    if (!recipient_email || !message_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isSelfRegister = purpose === 'self_register';

    // Fetch requester display name for the email
    const requesterResult = await pool.query(
      'SELECT display_name FROM users WHERE id = $1',
      [auth.userId]
    );
    if (requesterResult.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const senderName: string = requesterResult.rows[0].display_name;

    const recipientHash = hmacEmail(recipient_email);

    if (!await checkRateLimit(`requests:${auth.userId}`, 20, 3_600_000)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    const token = randomBytes(32).toString('hex');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify/${token}`;

    const result = await pool.query(
      `INSERT INTO verification_requests
         (requester_user_id, recipient_email_hash, message_text, token, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + ($5 * INTERVAL '1 minute'))
       RETURNING id, expires_at`,
      [auth.userId, recipientHash, message_text, token, isSelfRegister ? 5 : 1440]
    );

    // Send verification email server-side
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Roll back the request we just inserted so we don't leave orphaned rows
      await pool.query('DELETE FROM verification_requests WHERE id = $1', [result.rows[0].id]);
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    const subject = `${senderName} is asking you to verify your identity`;
    const bodyText = `${senderName} is asking you to verify your identity.\n\nClick the link below to verify:\n${verifyUrl}`;
    const bodyHtml = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem">
        <div style="text-align:center;margin-bottom:1.5rem">
          <span style="font-size:2.5rem">🔐</span>
          <h1 style="color:#1e3a8a;margin:0.5rem 0 0">VeriKey</h1>
        </div>
        <p style="font-size:1.05rem;color:#111"><strong>${senderName}</strong> is asking you to verify your identity.</p>
        <div style="margin:2rem 0;text-align:center">
          <a href="${verifyUrl}"
             style="display:inline-block;padding:0.9rem 2rem;background:#2563eb;color:#fff;text-decoration:none;border-radius:0.75rem;font-weight:700;font-size:1.1rem">
            Verify my identity
          </a>
        </div>
        <p style="font-size:0.82rem;color:#6b7280;text-align:center">
          This link is valid for 24 hours.<br>
          If you did not expect this, you can safely ignore this email.
        </p>
      </div>`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'VeriKey <noreply@content.verikey.com>',
        to: [recipient_email],
        subject,
        text: bodyText,
        html: bodyHtml,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.json().catch(() => ({}));
      console.error('[requests] Resend error:', JSON.stringify(err));
      await pool.query('DELETE FROM verification_requests WHERE id = $1', [result.rows[0].id]);
      // Resend sandbox only allows sending to the account's own email address.
      // If the error name is 'validation_error' or the message mentions 'testing',
      // surface a clearer message to the client.
      const resendMsg: string = err?.message ?? '';
      const isSandboxBlock = resendMsg.toLowerCase().includes('test') || resendMsg.toLowerCase().includes('domain') || err?.name === 'validation_error';
      const clientMsg = isSandboxBlock
        ? 'Email could not be delivered: your Resend account is in sandbox mode and can only send to your own email address. Add a verified domain in Resend to send to others.'
        : 'Failed to send verification email';
      return NextResponse.json({ error: clientMsg }, { status: 500 });
    }

    return NextResponse.json({
      id: result.rows[0].id,
      expires_at: result.rows[0].expires_at,
    });
  } catch (err) {
    console.error('[POST /api/requests]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
