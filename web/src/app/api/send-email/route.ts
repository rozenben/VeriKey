import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { to, senderName, verifyUrl, subject, lang } = await req.json();

    if (!to || !senderName || !verifyUrl || !subject) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    const bodyText = lang === 'he'
      ? `${senderName} מבקש לאמת את זהותך.\n\nלחץ על הקישור הבא לאימות:\n${verifyUrl}`
      : `${senderName} is asking you to verify your identity.\n\nClick the link below to verify:\n${verifyUrl}`;

    const bodyHtml = lang === 'he'
      ? `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem">
          <div style="text-align:center;margin-bottom:1.5rem">
            <span style="font-size:2.5rem">🔐</span>
            <h1 style="color:#1e3a8a;margin:0.5rem 0 0">VeriKey</h1>
          </div>
          <p style="font-size:1.05rem;color:#111"><strong>${senderName}</strong> מבקש לאמת את זהותך.</p>
          <div style="margin:2rem 0;text-align:center">
            <a href="${verifyUrl}"
               style="display:inline-block;padding:0.9rem 2rem;background:#2563eb;color:#fff;text-decoration:none;border-radius:0.75rem;font-weight:700;font-size:1.1rem">
              אמת זהות
            </a>
          </div>
          <p style="font-size:0.82rem;color:#6b7280;text-align:center">
            הקישור תקף ל־24 שעות.<br>
            אם לא ביקשת אימות זה, התעלם מהודעה זו.
          </p>
        </div>`
      : `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem">
          <div style="text-align:center;margin-bottom:1.5rem">
            <span style="font-size:2.5rem">🔐</span>
            <h1 style="color:#1e3a8a;margin:0.5rem 0 0">VeriKey</h1>
          </div>
          <p style="font-size:1.05rem;color:#111"><strong>${senderName}</strong> is asking you to verify your identity.</p>
          <div style="margin:2rem 0;text-align:center">
            <a href="${verifyUrl}"
               style="display:inline-block;padding:0.9rem 2rem;background:#2563eb;color:#fff;text-decoration:none;border-radius:0.75rem;font-weight:700;font-size:1.1rem">
              Verify my identity
            </a>
          </div>
          <p style="font-size:0.82rem;color:#6b7280;text-align:center">
            This link is valid for 24 hours.<br>
            If you did not expect this, you can safely ignore this email.
          </p>
        </div>`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'VeriKey <noreply@verikey.work>',
        to: [to],
        subject,
        text: bodyText,
        html: bodyHtml,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.json().catch(() => ({}));
      console.error('[send-email] Resend error:', err);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/send-email]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
