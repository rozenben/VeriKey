import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const result = await pool.query(
      'SELECT status, responded_at, expires_at FROM verification_requests WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      status: row.status,
      responded_at: row.responded_at,
      expires_at: row.expires_at,
    });
  } catch (err) {
    console.error('[GET /api/requests/:id/status]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
