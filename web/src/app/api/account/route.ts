import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireApiToken } from '@/lib/api-auth';

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireApiToken(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // verification_requests.requester_user_id is SET NULL on delete (migration 005)
    // credentials cascade delete automatically
    // api_tokens cascade delete automatically
    await pool.query('DELETE FROM users WHERE id = $1', [auth.userId]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/account]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
