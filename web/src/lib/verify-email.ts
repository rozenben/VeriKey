import pool from '@/lib/db';
import { decryptEmail } from '@/lib/encrypt';

export async function sendResultEmail(
  token: string,
  status: 'approved' | 'rejected',
  answer: 'yes' | 'no' | null,
  noteEncrypted: string | null
) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const result = await pool.query(
      `SELECT
         vr.message_text,
         vr.recipient_email_encrypted,
         u.display_name AS requester_name,
         u.email_encrypted AS requester_email_encrypted
       FROM verification_requests vr
       JOIN users u ON u.id = vr.requester_user_id
       WHERE vr.token = $1`,
      [token]
    );
    if (result.rowCount === 0) return;

    const row = result.rows[0];
    let requesterEmail: string;
    try { requesterEmail = decryptEmail(row.requester_email_encrypted); } catch { return; }

    let recipientEmail = '(unknown)';
    if (row.recipient_email_encrypted) {
      try { recipientEmail = decryptEmail(row.recipient_email_encrypted); } catch {}
    }

    let note = '';
    if (noteEncrypted) {
      try { note = decryptEmail(noteEncrypted); } catch {}
    }

    const isSuspicious = status === 'approved' && answer === 'no';
    const isConfirmed = status === 'approved' && answer === 'yes';

    let subject: string;
    let emoji: string;
    let headline: string;
    let bodyColor: string;
    let answerLine = '';

    if (isConfirmed) {
      subject = '✅ Identity verified — confirmed YES';
      emoji = '✅';
      headline = 'Identity Verified — Confirmed';
      bodyColor = '#15803d';
      answerLine = `<p style="color:#15803d;font-weight:700;font-size:1rem;margin:0.5rem 0">They answered: YES ✅</p>`;
    } else if (isSuspicious) {
      subject = '🚨 Identity verified — they said NO (suspicious)';
      emoji = '🚨';
      headline = 'Identity Verified — SUSPICIOUS';
      bodyColor = '#dc2626';
      answerLine = `<p style="color:#dc2626;font-weight:700;font-size:1rem;margin:0.5rem 0">They answered: NO ❌ — The real person denied this action.</p>`;
    } else {
      subject = '⚪ Verification declined';
      emoji = '⚪';
      headline = 'Verification Declined';
      bodyColor = '#6b7280';
      answerLine = `<p style="color:#6b7280;font-size:0.95rem;margin:0.5rem 0">The recipient chose not to participate.</p>`;
    }

    const noteHtml = note
      ? `<p style="background:#f9fafb;border-left:3px solid #d1d5db;padding:0.5rem 0.75rem;color:#374151;font-style:italic;margin:0.75rem 0">"${note}"</p>`
      : '';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:2rem">
        <div style="text-align:center;margin-bottom:1.5rem">
          <span style="font-size:2.5rem">${emoji}</span>
          <h1 style="color:${bodyColor};margin:0.5rem 0 0;font-size:1.3rem">${headline}</h1>
        </div>
        <p style="color:#374151">Your verification request to <strong>${recipientEmail}</strong> has been completed.</p>
        <div style="background:#f9fafb;border-radius:0.75rem;padding:1rem;margin:1rem 0">
          <p style="color:#6b7280;font-size:0.82rem;margin:0 0 0.4rem">Your question:</p>
          <p style="color:#111;font-style:italic;margin:0">"${row.message_text}"</p>
        </div>
        ${answerLine}
        ${noteHtml}
        ${isSuspicious ? `<div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:0.75rem;padding:0.85rem;margin-top:1rem"><p style="color:#dc2626;font-weight:700;margin:0">⚠️ The original message or request may be fraudulent. Do not take any action based on it.</p></div>` : ''}
        <p style="font-size:0.78rem;color:#9ca3af;margin-top:1.5rem;text-align:center">VeriKey · verikey.work</p>
      </div>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'VeriKey <noreply@verikey.work>',
        to: [requesterEmail],
        subject,
        html,
        text: `${headline}\n\nYour verification request to ${recipientEmail} for: "${row.message_text}"\n\n${isConfirmed ? 'They said YES.' : isSuspicious ? 'They said NO — SUSPICIOUS. The real person denied this action.' : 'Declined.'}\n${note ? `Note: "${note}"` : ''}`,
      }),
    });
  } catch (err) {
    console.error('[sendResultEmail]', err);
  }
}
