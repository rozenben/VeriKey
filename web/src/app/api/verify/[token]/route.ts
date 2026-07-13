import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { encryptEmail } from '@/lib/encrypt';
import { decryptEmail } from '@/lib/encrypt';

const ANSWER_TIME_LIMIT_MS = 10 * 60 * 1000; // 10 minutes from link open

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const result = await pool.query(
      `SELECT
         vr.id,
         vr.status,
         vr.message_text,
         vr.expires_at,
         vr.link_opened_at,
         u.display_name AS requester_name,
         (u.email_hash = vr.recipient_email_hash) AS is_self_registration
       FROM verification_requests vr
       JOIN users u ON u.id = vr.requester_user_id
       WHERE vr.token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Verification request not found' }, { status: 404 });
    }

    const row = result.rows[0];

    if (new Date(row.expires_at) < new Date()) {
      if (row.status === 'pending') {
        await pool.query(
          "UPDATE verification_requests SET status = 'expired' WHERE id = $1",
          [row.id]
        );
      }
      return NextResponse.json({ error: 'Verification link has expired' }, { status: 410 });
    }

    // Time-lock: record first open time
    if (!row.link_opened_at) {
      await pool.query(
        'UPDATE verification_requests SET link_opened_at = NOW() WHERE id = $1',
        [row.id]
      );
    }

    // Check if answer time window has expired (only applies after link_opened_at is set)
    const openedAt = row.link_opened_at ? new Date(row.link_opened_at).getTime() : Date.now();
    const answerDeadline = openedAt + ANSWER_TIME_LIMIT_MS;
    const answerExpired = Date.now() > answerDeadline;

    return NextResponse.json({
      requester_name: row.requester_name,
      message_text: row.message_text,
      status: row.status,
      is_self_registration: row.is_self_registration === true,
      answer_deadline: new Date(answerDeadline).toISOString(),
      answer_expired: answerExpired,
    });
  } catch (err) {
    console.error('[GET /api/verify/:token]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: reject a request (no biometric) or store answer pre-biometric
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await req.json();
    const { action, answer, note } = body as {
      action: 'reject' | 'set_answer';
      answer?: 'yes' | 'no';
      note?: string;
    };

    if (action === 'reject') {
      await pool.query(
        `UPDATE verification_requests
         SET status = 'rejected', responded_at = NOW()
         WHERE token = $1 AND status = 'pending'`,
        [token]
      );

      // Send alert email to requester on decline
      await sendResultEmail(token, 'rejected', null, null);

      return NextResponse.json({ success: true });
    }

    if (action === 'set_answer') {
      if (answer !== 'yes' && answer !== 'no') {
        return NextResponse.json({ error: 'answer must be yes or no' }, { status: 400 });
      }

      // Enforce time-lock: answer must come within ANSWER_TIME_LIMIT_MS of link open
      const lockCheck = await pool.query(
        'SELECT link_opened_at, expires_at FROM verification_requests WHERE token = $1 AND status = $2',
        [token, 'pending']
      );
      if (lockCheck.rowCount === 0) {
        return NextResponse.json({ error: 'Request not found or already completed' }, { status: 404 });
      }
      const { link_opened_at, expires_at } = lockCheck.rows[0];
      if (new Date(expires_at) < new Date()) {
        return NextResponse.json({ error: 'Verification link has expired' }, { status: 410 });
      }
      if (link_opened_at) {
        const elapsed = Date.now() - new Date(link_opened_at).getTime();
        if (elapsed > ANSWER_TIME_LIMIT_MS) {
          return NextResponse.json({ error: 'Answer time window has expired. Please ask for a new link.' }, { status: 410 });
        }
      }

      const noteEncrypted = note?.trim() ? encryptEmail(note.trim()) : null;

      await pool.query(
        `UPDATE verification_requests
         SET recipient_answer = $1, recipient_note_encrypted = $2
         WHERE token = $3 AND status = 'pending'`,
        [answer, noteEncrypted, token]
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[POST /api/verify/:token]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Send result email to requester after verification completes
export async function sendResultEmail(
  token: string,
  status: 'approved' | 'rejected',
  answer: 'yes' | 'no' | null,
  noteEncrypted: string | null
) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const result = await pool.query(
      `SELECT
         vr.message_text,
         vr.recipient_email_encrypted,
         vr.responded_at,
         u.display_name AS requester_name,
         u.email_encrypted AS requester_email_encrypted
       FROM verification_requests vr
       JOIN users u ON u.id = vr.requester_user_id
       WHERE vr.token = $1`,
      [token]
    );
    if (result.rowCount === 0) return;

    const row = result.rows[0];
    let requesterEmail: string;
    try { requesterEmail = decryptEmail(row.requester_email_encrypted); } catch { return; }

    let recipientEmail = '(unknown)';
    if (row.recipient_email_encrypted) {
      try { recipientEmail = decryptEmail(row.recipient_email_encrypted); } catch {}
    }

    let note = '';
    if (noteEncrypted) {
      try { note = decryptEmail(noteEncrypted); } catch {}
    }

    const isSuspicious = status === 'approved' && answer === 'no';
    const isConfirmed = status === 'approved' && answer === 'yes';
    const isDeclined = status === 'rejected';

    let subject: string;
    let emoji: string;
    let headline: string;
    let bodyColor: string;
    let answerLine = '';

    if (isConfirmed) {
      subject = '✅ Identity verified — confirmed YES';
      emoji = '✅';
      headline = 'Identity Verified — Confirmed';
      bodyColor = '#15803d';
      answerLine = `<p style="color:#15803d;font-weight:700;font-size:1rem;margin:0.5rem 0">They answered: YES ✅</p>`;
    } else if (isSuspicious) {
      subject = '🚨 Identity verified — they said NO (suspicious)';
      emoji = '🚨';
      headline = 'Identity Verified — SUSPICIOUS';
      bodyColor = '#dc2626';
      answerLine = `<p style="color:#dc2626;font-weight:700;font-size:1rem;margin:0.5rem 0">They answered: NO ❌ — The real person denied this action.</p>`;
    } else {
      subject = '⚪ Verification declined';
      emoji = '⚪';
      headline = 'Verification Declined';
      bodyColor = '#6b7280';
      answerLine = `<p style="color:#6b7280;font-size:0.95rem;margin:0.5rem 0">The recipient chose not to participate.</p>`;
    }

    const noteHtml = note
      ? `<p style="background:#f9fafb;border-left:3px solid #d1d5db;padding:0.5rem 0.75rem;color:#374151;font-style:italic;margin:0.75rem 0">"${note}"</p>`
      : '';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem">
        <div style="text-align:center;margin-bottom:1.5rem">
          <span style="font-size:2.5rem">${emoji}</span>
          <h1 style="color:${bodyColor};margin:0.5rem 0 0;font-size:1.3rem">${headline}</h1>
        </div>
        <p style="color:#374151">Your verification request to <strong>${recipientEmail}</strong> has been completed.</p>
        <div style="background:#f9fafb;border-radius:0.75rem;padding:1rem;margin:1rem 0">
          <p style="color:#6b7280;font-size:0.82rem;margin:0 0 0.4rem">Your question:</p>
          <p style="color:#111;font-style:italic;margin:0">"${row.message_text}"</p>
        </div>
        ${answerLine}
        ${noteHtml}
        ${isSuspicious ? `<div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:0.75rem;padding:0.85rem;margin-top:1rem"><p style="color:#dc2626;font-weight:700;margin:0">⚠️ The original message or request may be fraudulent. Do not take any action based on it.</p></div>` : ''}
        <p style="font-size:0.78rem;color:#9ca3af;margin-top:1.5rem;text-align:center">VeriKey · verikey.work</p>
      </div>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'VeriKey <noreply@verikey.work>',
        to: [requesterEmail],
        subject,
        html,
        text: `${headline}\n\nYour verification request to ${recipientEmail} for: "${row.message_text}"\n\n${isConfirmed ? 'They said YES.' : isSuspicious ? 'They said NO — SUSPICIOUS. The real person denied this action.' : 'Declined.'}\n${note ? `Note: "${note}"` : ''}`,
      }),
    });
  } catch (err) {
    console.error('[sendResultEmail]', err);
  }
}
