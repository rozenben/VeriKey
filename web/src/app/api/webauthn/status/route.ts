import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hmacPhone } from '@/lib/phone-hash';

export async function POST(req: NextRequest) {
  try {
    const { phone_number } = await req.json();
    if (!phone_number) {
      return NextResponse.json({ error: 'Missing phone_number' }, { status: 400 });
    }

    const phone_number_hash = hmacPhone(phone_number);

    const result = await pool.query(
      `SELECT COUNT(*) AS count FROM credentials c
       JOIN users u ON u.id = c.user_id
       WHERE u.phone_number_hash = $1`,
      [phone_number_hash]
    );

    const registered = parseInt(result.rows[0].count, 10) > 0;
    return NextResponse.json({ registered });
  } catch (err) {
    console.error('[POST /api/webauthn/status]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
