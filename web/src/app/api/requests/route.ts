import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import pool from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { hmacPhone } from '@/lib/phone-hash';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requester_phone, requester_name, recipient_phone, message_text } = body;

    if (!requester_phone || !requester_name || !recipient_phone || !message_text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const requesterHash = hmacPhone(requester_phone);
    const recipientHash = hmacPhone(recipient_phone);

    if (!checkRateLimit(requesterHash, 20, 3_600_000)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    // Auto-upsert requester — no pre-registration needed
    const upsert = await pool.query(
      `INSERT INTO users (phone_number_hash, display_name)
       VALUES ($1, $2)
       ON CONFLICT (phone_number_hash) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id`,
      [requesterHash, requester_name]
    );
    const requesterId: string = upsert.rows[0].id;

    const token = randomBytes(32).toString('hex');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

    const result = await pool.query(
      `INSERT INTO verification_requests
         (requester_user_id, recipient_phone_hash, message_text, token, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 minute')
       RETURNING id, expires_at`,
      [requesterId, recipientHash, message_text, token]
    );

    return NextResponse.json({
      id: result.rows[0].id,
      token,
      verification_url: `${baseUrl}/verify/${token}`,
      expires_at: result.rows[0].expires_at,
    });
  } catch (err) {
    console.error('[POST /api/requests]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
