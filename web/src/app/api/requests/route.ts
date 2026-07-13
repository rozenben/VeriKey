import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import pool from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { hmacEmail } from '@/lib/hash';
import { encryptEmail, decryptEmail } from '@/lib/encrypt';
import { requireApiToken } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiToken(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);

    const result = await pool.query(
      `SELECT id, recipient_email_encrypted, status, created_at, expires_at, responded_at,
              recipient_answer, recipient_note_encrypted
       FROM verification_requests
       WHERE requester_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [auth.userId, limit, offset]
    );

    const total = await pool.query(
      'SELECT COUNT(*) FROM verification_requests WHERE requester_user_id = $1',
      [auth.userId]
    );

    const rows = result.rows.map(row => ({
      id: row.id,
      recipient: row.recipient_email_encrypted
        ? (() => { try { return decryptEmail(row.recipient_email_encrypted); } catch { return '(unknown)'; } })()
        : '(unknown)',
      status: row.status,
      created_at: row.created_at,
      expires_at: row.expires_at,
      responded_at: row.responded_at,
      recipient_answer: row.recipient_answer ?? null,
      recipient_note: row.recipient_note_encrypted
        ? (() => { try { return decryptEmail(row.recipient_note_encrypted); } catch { return null; } })()
        : null,
    }));

    return NextResponse.json({ rows, total: parseInt(total.rows[0].count, 10) });
  } catch (err) {
    console.error('[GET /api/requests]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const requesterResult = await pool.query(
      'SELECT display_name FROM users WHERE id = $1',
      [auth.userId]
    );
    if (requesterResult.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const senderName: string = requesterResult.rows[0].display_name;

    const recipientHash = hmacEmail(recipient_email);
    const recipientEncrypted = encryptEmail(recipient_email.trim().toLowerCase());

    if (!await checkRateLimit(`requests:${auth.userId}`, 20, 3_600_000)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    const token = randomBytes(32).toString('hex');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify/${token}`;

    const result = await pool.query(
      `INSERT INTO verification_requests
         (requester_user_id, recipient_email_hash, recipient_email_encrypted, message_text, token, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + ($6 * INTERVAL '1 minute'))
       RETURNING id, expires_at`,
      [auth.userId, recipientHash, recipientEncrypted, message_text, token, isSelfRegister ? 5 : 1440]
    );

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
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
        from: 'VeriKey <noreply@verikey.work>',
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
