import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    emailEnabled: !!process.env.RESEND_API_KEY,
  });
}
