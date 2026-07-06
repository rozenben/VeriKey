import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hmacEmail } from '@/lib/hash';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const email_hash = hmacEmail(email);

    const result = await pool.query(
      `SELECT COUNT(*) AS count FROM credentials c
       JOIN users u ON u.id = c.user_id
       WHERE u.email_hash = $1`,
      [email_hash]
    );

    const registered = parseInt(result.rows[0].count, 10) > 0;
    return NextResponse.json({ registered });
  } catch (err) {
    console.error('[POST /api/webauthn/status]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
