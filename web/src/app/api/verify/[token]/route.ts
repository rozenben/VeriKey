import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

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
         u.display_name AS requester_name
       FROM verification_requests vr
       JOIN users u ON u.id = vr.requester_user_id
       WHERE vr.token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Verification request not found' }, { status: 404 });
    }

    const row = result.rows[0];

    // Check expiry
    if (new Date(row.expires_at) < new Date()) {
      // Mark as expired if still pending
      if (row.status === 'pending') {
        await pool.query(
          "UPDATE verification_requests SET status = 'expired' WHERE id = $1",
          [row.id]
        );
      }
      return NextResponse.json({ error: 'Verification link has expired' }, { status: 410 });
    }

    return NextResponse.json({
      requester_name: row.requester_name,
      message_text: row.message_text,
      status: row.status,
    });
  } catch (err) {
    console.error('[GET /api/verify/:token]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST used by the web page to reject a request
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await req.json();
    const { action } = body;

    if (action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await pool.query(
      `UPDATE verification_requests
       SET status = 'rejected', responded_at = NOW()
       WHERE token = $1 AND status = 'pending'`,
      [token]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/verify/:token]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
