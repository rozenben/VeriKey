import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { encryptEmail } from '@/lib/encrypt';
import { sendResultEmail } from '@/lib/verify-email';

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
