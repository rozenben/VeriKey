import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireApiToken } from '@/lib/api-auth';
import { decryptEmail } from '@/lib/encrypt';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireApiToken(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const result = await pool.query(
      `SELECT status, responded_at, expires_at, recipient_answer, recipient_note_encrypted
       FROM verification_requests
       WHERE id = $1 AND requester_user_id = $2`,
      [id, auth.userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const row = result.rows[0];

    let recipient_note: string | null = null;
    if (row.recipient_note_encrypted) {
      try { recipient_note = decryptEmail(row.recipient_note_encrypted); } catch {}
    }

    return NextResponse.json({
      status: row.status,
      responded_at: row.responded_at,
      expires_at: row.expires_at,
      recipient_answer: row.recipient_answer ?? null,
      recipient_note,
    });
  } catch (err) {
    console.error('[GET /api/requests/:id/status]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
