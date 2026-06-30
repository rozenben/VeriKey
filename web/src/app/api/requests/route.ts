import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import pool from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requester_id, phone_number_hash, message_text } = body;

    if (!requester_id || !phone_number_hash || !message_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Rate limit: 20 requests per hour per requester
    if (!checkRateLimit(requester_id, 20, 3_600_000)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    // Get requester user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [requester_id]
    );
    if (userResult.rowCount === 0) {
      return NextResponse.json({ error: 'Requester not found' }, { status: 404 });
    }

    const token = randomBytes(32).toString('hex');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

    const result = await pool.query(
      `INSERT INTO verification_requests
         (requester_user_id, recipient_phone_hash, message_text, token)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [requester_id, phone_number_hash, message_text, token]
    );

    const { id } = result.rows[0];

    return NextResponse.json({
      id,
      token,
      verification_url: `${baseUrl}/verify/${token}`,
    });
  } catch (err) {
    console.error('[POST /api/requests]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
