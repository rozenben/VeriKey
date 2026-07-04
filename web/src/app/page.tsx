'use client';

import { useState, useEffect, useRef } from 'react';

// ── Translations ────────────────────────────────────────────────────────────
const T = {
  he: {
    dir: 'rtl' as const,
    appTagline: 'אימות זהות ביומטרי — ללא התקנת אפליקציה',
    formTitle: 'שליחת בקשת אימות',
    labelName: 'השם שלך',
    placeholderName: 'לדוגמה: דוד כהן',
    labelMyPhone: 'מספר הטלפון שלך',
    labelRecipientPhone: 'מספר הטלפון של הנמען',
    labelMessage: 'הודעה',
    defaultMessage: 'אנא אמת את זהותך כדי שאדע שזה באמת אתה.',
    sendWhatsApp: 'שליחה דרך WhatsApp 💬',
    sendSMS: 'שליחה דרך SMS 📱',
    oneTapSend: 'שלח בלחיצה אחת',
    preferWhatsApp: 'העדיף WhatsApp',
    preferSMS: 'העדיף SMS',
    sending: 'יוצר קישור אימות…',
    whatsappOpened: '!WhatsApp נפתח',
    waitingDesc: (phone: string) => `ממתין ש־${phone} יאמת…`,
    pollNote: 'הדף מתעדכן אוטומטית כל 4 שניות.',
    verifyLinkLabel: 'קישור אימות:',
    sendAnother: 'שלח בקשה נוספת',
    approved: '!זהות אומתה',
    approvedDesc: (phone: string) => `${phone} אישר את זהותו ביומטרית.`,
    declined: 'דחייה',
    declinedDesc: 'הנמען דחה את בקשת האימות.',
    tryAgain: 'נסה שנית',
    errorName: 'יש להזין שם.',
    errorMyPhone: 'יש להזין את מספר הטלפון שלך.',
    errorRecipientPhone: 'יש להזין את מספר הטלפון של הנמען.',
    errorMessage: 'יש להזין הודעה.',
    errorGeneric: 'משהו השתבש. אנא נסה שנית.',
    errorNetwork: 'שגיאת רשת. אנא נסה שנית.',
    privacy: 'מספרי הטלפון מגובבים מקומית ולא נשמרים בטקסט גלוי.\nאימות ביומטרי מבוסס על WebAuthn / Passkeys — ללא סיסמה.',
    langLabel: 'EN',
    defaultCountryCode: '+972',
  },
  en: {
    dir: 'ltr' as const,
    appTagline: 'Biometric identity verification — no app needed',
    formTitle: 'Send a verification request',
    labelName: 'Your name',
    placeholderName: 'e.g. David Cohen',
    labelMyPhone: 'Your phone number',
    labelRecipientPhone: "Recipient's phone number",
    labelMessage: 'Message',
    defaultMessage: "Please verify your identity so I know it's really you.",
    sendWhatsApp: 'Send via WhatsApp 💬',
    sendSMS: 'Send via SMS 📱',
    oneTapSend: 'Send in one tap',
    preferWhatsApp: 'Prefer WhatsApp',
    preferSMS: 'Prefer SMS',
    sending: 'Creating verification link…',
    whatsappOpened: 'WhatsApp opened!',
    waitingDesc: (phone: string) => `Waiting for ${phone} to verify…`,
    pollNote: 'This page checks automatically every 4 seconds.',
    verifyLinkLabel: 'Verification link:',
    sendAnother: 'Send another request',
    approved: 'Identity Verified!',
    approvedDesc: (phone: string) => `${phone} confirmed their identity with biometrics.`,
    declined: 'Declined',
    declinedDesc: 'The recipient declined the verification request.',
    tryAgain: 'Try again',
    errorName: 'Enter your name.',
    errorMyPhone: 'Enter your phone number.',
    errorRecipientPhone: "Enter the recipient's phone number.",
    errorMessage: 'Enter a message.',
    errorGeneric: 'Something went wrong.',
    errorNetwork: 'Network error. Please try again.',
    privacy: 'Phone numbers are hashed locally and never stored in plain text.\nBiometric verification uses WebAuthn / Passkeys — no password needed.',
    langLabel: 'עברית',
    defaultCountryCode: '+1',
  },
} as const;

type Lang = keyof typeof T;
type Platform = 'whatsapp' | 'sms';
type Step = 'form' | 'sending' | 'sent' | 'approved' | 'declined';

// ── Helpers ─────────────────────────────────────────────────────────────────
function sha256hex(str: string): Promise<string> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then((buf) =>
    Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
  );
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

function buildWaUrl(recipientPhone: string, senderName: string, verifyUrl: string): string {
  const text = encodeURIComponent(`${senderName} מבקש לאמת את זהותך. לחץ כאן: ${verifyUrl}`);
  return `https://wa.me/${normalizePhone(recipientPhone)}?text=${text}`;
}

function buildSmsUrl(recipientPhone: string, senderName: string, verifyUrl: string): string {
  const text = encodeURIComponent(`${senderName} מבקש לאמת את זהותך. לחץ כאן: ${verifyUrl}`);
  return `sms:${normalizePhone(recipientPhone)}?body=${text}`;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [lang, setLang] = useState<Lang>('he');
  const [step, setStep] = useState<Step>('form');
  const [myName, setMyName] = useState('');
  const [myPhone, setMyPhone] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [message, setMessage] = useState('');
  const [platform, setPlatform] = useState<Platform>('whatsapp');
  const [error, setError] = useState('');
  const [verifyUrl, setVerifyUrl] = useState('');
  const [requestId, setRequestId] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load saved preferences
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('verikey_prefs') ?? '{}');
      if (saved.lang) setLang(saved.lang);
      if (saved.name) setMyName(saved.name);
      if (saved.phone) setMyPhone(saved.phone);
      if (saved.platform) setPlatform(saved.platform);
    } catch {}
  }, []);

  // Set default message when lang changes (only if field is empty or has a default)
  useEffect(() => {
    setMessage(T[lang].defaultMessage);
  }, [lang]);

  // Prefill country code when lang changes and phone is empty
  useEffect(() => {
    if (!myPhone) setMyPhone(T[lang].defaultCountryCode);
  }, [lang]);

  // Polling
  useEffect(() => {
    if (step === 'sent') {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/requests/${requestId}/status`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'approved') { setStep('approved'); clearInterval(pollRef.current!); }
            else if (data.status === 'declined' || data.status === 'rejected') { setStep('declined'); clearInterval(pollRef.current!); }
          }
        } catch {}
      }, 4000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, requestId]);

  const t = T[lang];

  function savePrefs(overrides: Partial<{ lang: Lang; name: string; phone: string; platform: Platform }>) {
    try {
      const current = JSON.parse(localStorage.getItem('verikey_prefs') ?? '{}');
      localStorage.setItem('verikey_prefs', JSON.stringify({ ...current, ...overrides }));
    } catch {}
  }

  function toggleLang() {
    const next: Lang = lang === 'he' ? 'en' : 'he';
    setLang(next);
    savePrefs({ lang: next });
  }

  function selectPlatform(p: Platform) {
    setPlatform(p);
    savePrefs({ platform: p });
  }

  async function handleSend(forcePlatform?: Platform) {
    setError('');
    const usePlatform = forcePlatform ?? platform;
    const myPhoneNorm = normalizePhone(myPhone);
    const recipientPhoneNorm = normalizePhone(recipientPhone);

    if (!myName.trim()) { setError(t.errorName); return; }
    if (myPhoneNorm.length < 7) { setError(t.errorMyPhone); return; }
    if (recipientPhoneNorm.length < 7) { setError(t.errorRecipientPhone); return; }
    if (!message.trim()) { setError(t.errorMessage); return; }

    setStep('sending');
    savePrefs({ name: myName.trim(), phone: myPhone });

    const [myHash, recipientHash] = await Promise.all([
      sha256hex('verikey-salt' + myPhoneNorm),
      sha256hex('verikey-salt' + recipientPhoneNorm),
    ]);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_phone_hash: myHash,
          requester_name: myName.trim(),
          recipient_phone_hash: recipientHash,
          message_text: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t.errorGeneric);
        setStep('form');
        return;
      }

      const data = await res.json();
      setVerifyUrl(data.verification_url);
      setRequestId(data.id);

      const url = usePlatform === 'whatsapp'
        ? buildWaUrl(recipientPhone, myName.trim(), data.verification_url)
        : buildSmsUrl(recipientPhone, myName.trim(), data.verification_url);
      window.open(url, '_blank');

      setStep('sent');
    } catch {
      setError(t.errorNetwork);
      setStep('form');
    }
  }

  function handleReset() {
    setStep('form');
    setVerifyUrl('');
    setRequestId('');
    setError('');
    setRecipientPhone('');
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.85rem 1rem',
    fontSize: '1rem',
    border: '1.5px solid #e5e7eb',
    borderRadius: '0.75rem',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fff',
    color: '#111',
    direction: t.dir,
  };

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    padding: '0.9rem',
    fontSize: '1.05rem',
    fontWeight: 700,
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
  };

  const card: React.CSSProperties = {
    background: '#fff',
    borderRadius: '1.25rem',
    boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
    padding: '2rem 1.5rem',
    width: '100%',
    maxWidth: 420,
    direction: t.dir,
    textAlign: t.dir === 'rtl' ? 'right' : 'left',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#374151',
    display: 'block',
    marginBottom: '0.3rem',
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main style={{
      minHeight: '100vh',
      background: '#f0f4ff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '2rem 1rem',
      fontFamily: t.dir === 'rtl' ? "'Segoe UI', Arial, sans-serif" : "'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center', width: '100%', maxWidth: 420, position: 'relative' }}>
        <button
          onClick={toggleLang}
          style={{
            position: 'absolute',
            top: 0,
            [t.dir === 'rtl' ? 'left' : 'right']: 0,
            background: '#e0e7ff',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.3rem 0.7rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            color: '#3730a3',
          }}
        >
          {t.langLabel}
        </button>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🔐</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a8a', margin: 0 }}>VeriKey</h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>{t.appTagline}</p>
      </div>

      <div style={card}>
        {/* ── FORM ── */}
        {step === 'form' && (
          <>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', color: '#111', marginTop: 0 }}>
              {t.formTitle}
            </h2>

            {/* Platform preference toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {(['whatsapp', 'sms'] as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => selectPlatform(p)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '0.6rem',
                    border: `2px solid ${platform === p ? '#2563eb' : '#e5e7eb'}`,
                    background: platform === p ? '#eff6ff' : '#f9fafb',
                    color: platform === p ? '#2563eb' : '#6b7280',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  {p === 'whatsapp' ? `WhatsApp 💬` : `SMS 📱`}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={labelStyle}>{t.labelName}</label>
                <input style={inputStyle} placeholder={t.placeholderName} value={myName} onChange={e => setMyName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{t.labelMyPhone}</label>
                <input style={inputStyle} type="tel" value={myPhone} onChange={e => setMyPhone(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{t.labelRecipientPhone}</label>
                <input style={inputStyle} type="tel" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{t.labelMessage}</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 } as React.CSSProperties} value={message} onChange={e => setMessage(e.target.value)} />
              </div>

              {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{error}</p>}

              {/* One-tap primary send button */}
              <button style={btnPrimary} onClick={() => handleSend()}>
                {platform === 'whatsapp' ? t.sendWhatsApp : t.sendSMS}
              </button>

              {/* Secondary send via other platform */}
              <button
                onClick={() => handleSend(platform === 'whatsapp' ? 'sms' : 'whatsapp')}
                style={{ ...btnPrimary, background: 'transparent', color: '#6b7280', fontSize: '0.85rem', border: '1.5px solid #e5e7eb', marginTop: 0 }}
              >
                {platform === 'whatsapp' ? t.sendSMS : t.sendWhatsApp}
              </button>
            </div>
          </>
        )}

        {/* ── SENDING ── */}
        {step === 'sending' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
            <p style={{ color: '#6b7280' }}>{t.sending}</p>
          </div>
        )}

        {/* ── SENT ── */}
        {step === 'sent' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2.5rem' }}>✅</div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>{t.whatsappOpened}</h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{t.waitingDesc(recipientPhone)}</p>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: '0.75rem', padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#374151', wordBreak: 'break-all', direction: 'ltr', textAlign: 'left' }}>
              <strong>{t.verifyLinkLabel}</strong><br />
              <a href={verifyUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{verifyUrl}</a>
            </div>

            {/* Resend via other platform */}
            <button
              onClick={() => {
                const url = platform === 'whatsapp'
                  ? buildSmsUrl(recipientPhone, myName, verifyUrl)
                  : buildWaUrl(recipientPhone, myName, verifyUrl);
                window.open(url, '_blank');
              }}
              style={{ ...btnPrimary, background: '#0891b2', marginTop: 0 }}
            >
              {platform === 'whatsapp' ? t.sendSMS : t.sendWhatsApp}
            </button>

            <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: '#fef9c3', borderRadius: '0.75rem', fontSize: '0.875rem', color: '#854d0e', textAlign: 'center' }}>
              ⏳ {t.waitingDesc(recipientPhone)}<br />
              <span style={{ fontSize: '0.8rem', color: '#92400e' }}>{t.pollNote}</span>
            </div>

            <button onClick={handleReset} style={{ width: '100%', marginTop: '1rem', background: 'transparent', border: 'none', color: '#6b7280', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
              {t.sendAnother}
            </button>
          </>
        )}

        {/* ── APPROVED ── */}
        {step === 'approved' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', marginBottom: '0.5rem' }}>{t.approved}</h2>
            <p style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{t.approvedDesc(recipientPhone)}</p>
            <button style={btnPrimary} onClick={handleReset}>{t.sendAnother}</button>
          </div>
        )}

        {/* ── DECLINED ── */}
        {step === 'declined' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>❌</div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#dc2626', marginBottom: '0.5rem' }}>{t.declined}</h2>
            <p style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{t.declinedDesc}</p>
            <button style={btnPrimary} onClick={handleReset}>{t.tryAgain}</button>
          </div>
        )}
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center', maxWidth: 380, direction: t.dir, whiteSpace: 'pre-line' }}>
        {t.privacy}
      </p>
    </main>
  );
}
