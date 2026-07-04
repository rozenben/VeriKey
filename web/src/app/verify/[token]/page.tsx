'use client';

import { useState, useEffect, useCallback } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

// ── Translations ─────────────────────────────────────────────────────────────
const T = {
  he: {
    dir: 'rtl' as const,
    loading: 'טוען…',
    expired: 'הקישור פג תוקף',
    expiredDesc: 'קישור האימות פג תוקף. בקש מהשולח לשלוח קישור חדש.',
    errorTitle: 'משהו השתבש',
    successTitle: 'זהות אומתה',
    successDesc: 'האימות הביומטרי שלך הצליח.',
    declinedTitle: 'דחייה',
    declinedDesc: 'דחית את בקשת האימות.',
    requesterMsg: (name: string) => `${name} מבקש לאמת את זהותך.`,
    reasonLabel: 'סיבה:',
    phonePrompt: 'הזן את מספר הטלפון שלך לאימות:',
    phonePlaceholder: '+972 50 000 0000',
    continueBtn: 'המשך',
    noPasskeyDesc: 'אין לך עדיין מפתח גישה. הגדר אימות ביומטרי לאישור בקשות עתידיות בקלות.',
    setupBtn: 'הגדר אימות ביומטרי',
    approveBtn: 'אשר עם Face ID / טביעת אצבע',
    declineBtn: 'דחה',
    langLabel: 'EN',
    notYou: 'זה לא אתה?',
  },
  en: {
    dir: 'ltr' as const,
    loading: 'Loading…',
    expired: 'Link Expired',
    expiredDesc: 'This verification link has expired. Please ask the requester to send a new one.',
    errorTitle: 'Something went wrong',
    successTitle: 'Identity Confirmed',
    successDesc: 'Your biometric verification was successful.',
    declinedTitle: 'Declined',
    declinedDesc: 'You declined this verification request.',
    requesterMsg: (name: string) => `${name} is asking you to confirm your identity.`,
    reasonLabel: 'Reason:',
    phonePrompt: 'Enter your phone number to verify:',
    phonePlaceholder: '+1 555 000 0000',
    continueBtn: 'Continue',
    noPasskeyDesc: "You don't have a passkey yet. Set up biometric verification to approve requests quickly in the future.",
    setupBtn: 'Set up Biometric Verification',
    approveBtn: 'Approve with Face ID / Fingerprint',
    declineBtn: 'Decline',
    langLabel: 'עברית',
    notYou: 'Not you?',
  },
} as const;

type Lang = keyof typeof T;

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

type RequestDetails = { requester_name: string; message_text: string; status: string };
type FlowState = 'idle' | 'loading' | 'phone-input' | 'register' | 'authenticate' | 'success' | 'declined' | 'expired' | 'error';

async function checkCredentials(phoneValue: string, tokenValue: string): Promise<'register' | 'authenticate' | 'error'> {
  const res = await fetch('/api/webauthn/auth/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: normalizePhone(phoneValue), token: tokenValue }),
  });
  if (res.status === 404) return 'register';
  if (res.ok) return 'authenticate';
  return 'error';
}

export default function VerifyPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [lang, setLang] = useState<Lang>('he');
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [flowState, setFlowState] = useState<FlowState>('loading');
  const [phone, setPhone] = useState('');
  const [phoneNorm, setPhoneNorm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  // Whether the phone was auto-filled from the saved profile
  const [autoFilledPhone, setAutoFilledPhone] = useState('');

  // Suppress PWA install prompt on this page — install is only offered from the main page
  useEffect(() => {
    const suppress = (e: Event) => e.preventDefault();
    window.addEventListener('beforeinstallprompt', suppress);
    return () => window.removeEventListener('beforeinstallprompt', suppress);
  }, []);

  useEffect(() => {
    async function init() {
      // Load saved prefs
      let savedPhone = '';
      try {
        const prefs = JSON.parse(localStorage.getItem('verikey_prefs') ?? '{}');
        if (prefs.lang) setLang(prefs.lang);
        if (prefs.phone) savedPhone = prefs.phone;
      } catch {}

      // Load the verification request
      try {
        const res = await fetch(`/api/verify/${token}`);
        if (res.status === 410) { setFlowState('expired'); return; }
        if (!res.ok) { setFlowState('error'); setErrorMsg('Verification link not found or invalid.'); return; }
        const data: RequestDetails = await res.json();
        setRequestDetails(data);
        if (data.status === 'approved') { setFlowState('success'); return; }
        if (data.status === 'rejected') { setFlowState('declined'); return; }

        // If we have a saved phone, auto-check credentials and skip the phone input step
        if (savedPhone) {
          setPhone(savedPhone);
          setAutoFilledPhone(savedPhone);
          setPhoneNorm(normalizePhone(savedPhone));
          const next = await checkCredentials(savedPhone, token);
          setFlowState(next === 'error' ? 'phone-input' : next);
        } else {
          setFlowState('phone-input');
        }
      } catch {
        setFlowState('error');
        setErrorMsg('Failed to load verification request.');
      }
    }
    init();
  }, [token]);

  const t = T[lang];

  function toggleLang() {
    setLang(l => l === 'he' ? 'en' : 'he');
  }

  const handlePhoneSubmit = useCallback(async () => {
    if (!phone.trim()) return;
    setFlowState('loading');
    try {
      const norm = normalizePhone(phone.trim());
      setPhoneNorm(norm);
      const authRes = await fetch('/api/webauthn/auth/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: norm, token }),
      });
      if (authRes.status === 404) setFlowState('register');
      else if (authRes.ok) setFlowState('authenticate');
      else { setFlowState('error'); setErrorMsg((await authRes.json().catch(() => ({}))).error ?? 'Unexpected error.'); }
    } catch {
      setFlowState('error');
      setErrorMsg('Failed to check credentials. Please try again.');
    }
  }, [phone, token]);

  const handleRegister = useCallback(async () => {
    setFlowState('loading');
    setStatusMsg(lang === 'he' ? 'מגדיר אישור ביומטרי…' : 'Setting up biometric credential…');
    try {
      const optRes = await fetch('/api/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNorm, display_name: phone, token }),
      });
      if (optRes.status === 403) {
        const { error } = await optRes.json().catch(() => ({}));
        throw new Error(error ?? 'This link was not sent to that phone number.');
      }
      if (!optRes.ok) throw new Error('Failed to get registration options');
      const regResponse = await startRegistration(await optRes.json());
      const verRes = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNorm, registration_response: regResponse, token }),
      });
      if (!verRes.ok) throw new Error('Registration verification failed');
      setFlowState('success');
    } catch (err: unknown) {
      setFlowState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed.');
    }
  }, [phoneNorm, phone, token, lang]);

  const handleAuthenticate = useCallback(async () => {
    setFlowState('loading');
    setStatusMsg(lang === 'he' ? 'ממתין לאישור ביומטרי…' : 'Waiting for biometric confirmation…');
    try {
      const optRes = await fetch('/api/webauthn/auth/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNorm, token }),
      });
      if (optRes.status === 403) {
        const { error } = await optRes.json().catch(() => ({}));
        throw new Error(error ?? 'This link was not sent to that phone number.');
      }
      if (!optRes.ok) throw new Error('Failed to get authentication options');
      const authResponse = await startAuthentication(await optRes.json());
      const verRes = await fetch('/api/webauthn/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNorm, token, auth_response: authResponse }),
      });
      if (!verRes.ok) throw new Error('Authentication verification failed');
      setFlowState('success');
    } catch (err: unknown) {
      setFlowState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
    }
  }, [phoneNorm, token, lang]);

  const handleDecline = useCallback(async () => {
    try {
      await fetch(`/api/verify/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
    } catch {}
    setFlowState('declined');
  }, [token]);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem',
    textAlign: 'center',
    maxWidth: 480,
    margin: '0 auto',
    direction: t.dir,
    fontFamily: "'Segoe UI', Arial, sans-serif",
  };

  const btnStyle: React.CSSProperties = {
    width: '100%',
    padding: '1rem',
    borderRadius: 12,
    border: 'none',
    fontSize: '1.1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '1rem',
  };

  const langBtn: React.CSSProperties = {
    position: 'fixed',
    top: '1rem',
    [t.dir === 'rtl' ? 'left' : 'right']: '1rem',
    background: '#e0e7ff',
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0.3rem 0.7rem',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    color: '#3730a3',
  };

  if (flowState === 'loading') return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      <p style={{ color: '#6b7280' }}>{statusMsg || t.loading}</p>
    </main>
  );

  if (flowState === 'expired') return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      <div style={{ fontSize: '3rem' }}>⏰</div>
      <h1 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{t.expired}</h1>
      <p style={{ color: '#6b7280' }}>{t.expiredDesc}</p>
    </main>
  );

  if (flowState === 'error') return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <h1 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{t.errorTitle}</h1>
      <p style={{ color: '#6b7280' }}>{errorMsg}</p>
    </main>
  );

  if (flowState === 'success') return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      <div style={{ fontSize: '3rem' }}>✅</div>
      <h1 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{t.successTitle}</h1>
      <p style={{ color: '#6b7280' }}>{t.successDesc}</p>
    </main>
  );

  if (flowState === 'declined') return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      <div style={{ fontSize: '3rem' }}>❌</div>
      <h1 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{t.declinedTitle}</h1>
      <p style={{ color: '#6b7280' }}>{t.declinedDesc}</p>
    </main>
  );

  return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>

      {requestDetails && (
        <>
          <div style={{ fontSize: '2.5rem' }}>🔐</div>
          <h1 style={{ fontSize: '1.5rem', marginTop: '1rem', marginBottom: '0.5rem' }}>VeriKey</h1>
          <p style={{ color: '#374151', marginBottom: '0.25rem' }}>
            <strong>{t.requesterMsg(requestDetails.requester_name)}</strong>
          </p>
          <p style={{ color: '#6b7280', fontStyle: 'italic', marginBottom: '1.5rem' }}>
            {t.reasonLabel} {requestDetails.message_text}
          </p>
        </>
      )}

      {flowState === 'phone-input' && (
        <>
          <p style={{ color: '#374151', marginBottom: '0.5rem' }}>{t.phonePrompt}</p>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t.phonePlaceholder}
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box', direction: 'ltr' }}
            onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
          />
          <button onClick={handlePhoneSubmit} style={{ ...btnStyle, background: '#2563eb', color: '#fff' }}>
            {t.continueBtn}
          </button>
        </>
      )}

      {/* Phone chip shown when auto-filled — lets user switch to a different number */}
      {autoFilledPhone && (flowState === 'register' || flowState === 'authenticate') && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem', background: '#f0f4ff', borderRadius: '0.75rem', padding: '0.5rem 0.9rem' }}>
          <span style={{ fontSize: '1rem' }}>📱</span>
          <span style={{ fontWeight: 600, color: '#1e3a8a', direction: 'ltr' }}>{autoFilledPhone}</span>
          <button onClick={() => { setAutoFilledPhone(''); setPhone(''); setPhoneNorm(''); setFlowState('phone-input'); }}
            style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
            {t.notYou}
          </button>
        </div>
      )}

      {flowState === 'register' && (
        <>
          <p style={{ color: '#374151', marginBottom: '1rem' }}>{t.noPasskeyDesc}</p>
          <button onClick={handleRegister} style={{ ...btnStyle, background: '#059669', color: '#fff' }}>{t.setupBtn}</button>
          <button onClick={handleDecline} style={{ ...btnStyle, background: '#f3f4f6', color: '#374151' }}>{t.declineBtn}</button>
        </>
      )}

      {flowState === 'authenticate' && (
        <>
          <button onClick={handleAuthenticate} style={{ ...btnStyle, background: '#2563eb', color: '#fff', fontSize: '1.2rem', padding: '1.25rem' }}>
            {t.approveBtn}
          </button>
          <button onClick={handleDecline} style={{ ...btnStyle, background: '#f3f4f6', color: '#374151' }}>{t.declineBtn}</button>
        </>
      )}
    </main>
  );
}
