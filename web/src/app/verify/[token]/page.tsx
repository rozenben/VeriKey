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
    selfSetupSuccessTitle: 'האימות הביומטרי הוגדר!',
    selfSetupSuccessDesc: 'מעכשיו תוכל לאשר בקשות אימות בלחיצה אחת.',
    selfSetupSuccessDescRepeat: 'מפתח הגישה עודכן בהצלחה.',
    declinedTitle: 'דחייה',
    declinedDesc: 'דחית את בקשת האימות.',
    requesterMsg: (name: string) => `${name} מבקש לאמת את זהותך.`,
    selfSetupTitle: 'הגדרת VeriKey',
    selfSetupDesc: 'לחץ כדי להגדיר אימות ביומטרי במכשיר זה.',
    reasonLabel: 'סיבה:',
    emailPrompt: 'הזן את כתובת האימייל שלך לאימות:',
    emailPlaceholder: 'you@example.com',
    labelName: 'השם שלך',
    namePlaceholder: 'לדוגמה: דוד כהן',
    continueBtn: 'המשך',
    sendOtp: 'שלח קוד אימות',
    otpSentDesc: (email: string) => `שלחנו קוד בן 6 ספרות ל־${email}`,
    labelOtp: 'קוד אימות',
    otpPlaceholder: '123456',
    noPasskeyDesc: 'אין לך עדיין מפתח גישה. הגדר אימות ביומטרי לאישור בקשות עתידיות בקלות.',
    setupBtn: 'הגדר אימות ביומטרי',
    approveBtn: 'אשר עם Face ID / טביעת אצבע',
    declineBtn: 'דחה',
    installApp: 'התקן אפליקציה 📲',
    installAppDesc: 'התקן את האפליקציה כדי שתוכל להשתמש בה לאימות אחרים.',
    langLabel: 'EN',
    notYou: 'זה לא אתה?',
    resendOtp: 'שלח שוב',
  },
  en: {
    dir: 'ltr' as const,
    loading: 'Loading…',
    expired: 'Link Expired',
    expiredDesc: 'This verification link has expired. Please ask the requester to send a new one.',
    errorTitle: 'Something went wrong',
    successTitle: 'Identity Confirmed',
    successDesc: 'Your biometric verification was successful.',
    selfSetupSuccessTitle: 'Biometric verification is set up!',
    selfSetupSuccessDesc: 'You can now approve verification requests in one tap.',
    selfSetupSuccessDescRepeat: 'Your passkey has been updated successfully.',
    declinedTitle: 'Declined',
    declinedDesc: 'You declined this verification request.',
    requesterMsg: (name: string) => `${name} is asking you to confirm your identity.`,
    selfSetupTitle: 'Set up VeriKey',
    selfSetupDesc: 'Tap below to register your biometric on this device.',
    reasonLabel: 'Reason:',
    emailPrompt: 'Enter your email address to verify:',
    emailPlaceholder: 'you@example.com',
    labelName: 'Your name',
    namePlaceholder: 'e.g. David Cohen',
    continueBtn: 'Continue',
    sendOtp: 'Send verification code',
    otpSentDesc: (email: string) => `We sent a 6-digit code to ${email}`,
    labelOtp: 'Verification code',
    otpPlaceholder: '123456',
    noPasskeyDesc: "You don't have a passkey yet. Set up biometric verification to approve requests quickly in the future.",
    setupBtn: 'Set up Biometric Verification',
    approveBtn: 'Approve with Face ID / Fingerprint',
    declineBtn: 'Decline',
    installApp: 'Install App 📲',
    installAppDesc: 'Install the app so you can use it to verify others.',
    langLabel: 'עברית',
    notYou: 'Not you?',
    resendOtp: 'Resend',
  },
} as const;

type Lang = keyof typeof T;
type RequestDetails = { requester_name: string; message_text: string; status: string; is_self_registration: boolean };
type FlowState = 'idle' | 'loading' | 'email-input' | 'register' | 'register-otp-sent' | 'authenticate' | 'success' | 'declined' | 'expired' | 'error';

export default function VerifyPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [lang, setLang] = useState<Lang>('he');
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [flowState, setFlowState] = useState<FlowState>('loading');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [autoFilledEmail, setAutoFilledEmail] = useState('');
  const [firstTimeSetup, setFirstTimeSetup] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [pwaInstallable, setPwaInstallable] = useState(false);

  useEffect(() => {
    if ((window as any).__pwaPrompt) setPwaInstallable(true);
    const onInstallable = () => setPwaInstallable(true);
    window.addEventListener('pwa-installable', onInstallable);
    return () => window.removeEventListener('pwa-installable', onInstallable);
  }, []);

  useEffect(() => {
    async function init() {
      let savedEmail = '';
      let savedName = '';
      try {
        const prefs = JSON.parse(localStorage.getItem('verikey_prefs') ?? '{}');
        if (prefs.lang) setLang(prefs.lang);
        if (prefs.email) { savedEmail = prefs.email; setEmail(prefs.email); }
        if (prefs.name) { savedName = prefs.name; setDisplayName(prefs.name); }
      } catch {}

      try {
        const res = await fetch(`/api/verify/${token}`);
        if (res.status === 410) { setFlowState('expired'); return; }
        if (!res.ok) { setFlowState('error'); setErrorMsg('Verification link not found or invalid.'); return; }
        const data: RequestDetails = await res.json();
        setRequestDetails(data);
        if (data.status === 'approved') { setFlowState('success'); return; }
        if (data.status === 'rejected') { setFlowState('declined'); return; }

        if (savedEmail) {
          setAutoFilledEmail(savedEmail);
          // Check if this email has credentials
          const authRes = await fetch('/api/webauthn/auth/options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: savedEmail, token }),
          });
          if (authRes.status === 404) setFlowState('register');
          else if (authRes.ok) setFlowState('authenticate');
          else setFlowState('email-input');
        } else {
          setFlowState('email-input');
        }
      } catch {
        setFlowState('error');
        setErrorMsg('Failed to load verification request.');
      }
    }
    init();
  }, [token]);

  const t = T[lang];
  function toggleLang() { setLang(l => l === 'he' ? 'en' : 'he'); }

  const handleEmailSubmit = useCallback(async () => {
    if (!email.trim()) return;
    setFlowState('loading');
    const emailNorm = email.trim().toLowerCase();
    try {
      const authRes = await fetch('/api/webauthn/auth/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailNorm, token }),
      });
      if (authRes.status === 404) { setEmail(emailNorm); setFlowState('register'); }
      else if (authRes.ok) { setEmail(emailNorm); setFlowState('authenticate'); }
      else { setFlowState('error'); setErrorMsg((await authRes.json().catch(() => ({}))).error ?? 'Unexpected error.'); }
    } catch {
      setFlowState('error');
      setErrorMsg('Failed to check credentials. Please try again.');
    }
  }, [email, token]);

  // Registration: send OTP first
  const handleSendRegisterOtp = useCallback(async () => {
    setErrorMsg('');
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), purpose: 'register' }),
    });
    if (!res.ok) { setErrorMsg('Failed to send code. Please try again.'); return; }
    setFlowState('register-otp-sent');
  }, [email]);

  const handleRegister = useCallback(async () => {
    if (otpCode.length !== 6) { setErrorMsg('Enter the 6-digit code.'); return; }
    setErrorMsg('');
    setStatusMsg(lang === 'he' ? 'מגדיר אישור ביומטרי…' : 'Setting up biometric credential…');
    setFlowState('loading');
    try {
      const emailNorm = email.trim().toLowerCase();
      const name = displayName.trim() || emailNorm;
      const optRes = await fetch('/api/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailNorm, display_name: name, otp: otpCode, token }),
      });
      if (optRes.status === 403) {
        const { error } = await optRes.json().catch(() => ({}));
        throw new Error(error ?? 'This link was not sent to that email address.');
      }
      if (!optRes.ok) {
        const { error } = await optRes.json().catch(() => ({}));
        throw new Error(error ?? 'Failed to get registration options');
      }
      const regResponse = await startRegistration(await optRes.json());
      const verRes = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailNorm, registration_response: regResponse, otp: otpCode, token }),
      });
      if (!verRes.ok) {
        const { error } = await verRes.json().catch(() => ({}));
        throw new Error(error ?? 'Registration verification failed');
      }
      const isFirst = !localStorage.getItem('verikey_setup_done');
      if (isFirst) localStorage.setItem('verikey_setup_done', '1');
      setFirstTimeSetup(isFirst);
      setFlowState('success');
    } catch (err: unknown) {
      setFlowState('register-otp-sent');
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed.');
    }
  }, [email, displayName, otpCode, token, lang]);

  const handleAuthenticate = useCallback(async () => {
    setStatusMsg(lang === 'he' ? 'ממתין לאישור ביומטרי…' : 'Waiting for biometric confirmation…');
    setFlowState('loading');
    try {
      const emailNorm = email.trim().toLowerCase();
      const optRes = await fetch('/api/webauthn/auth/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailNorm, token }),
      });
      if (optRes.status === 403) {
        const { error } = await optRes.json().catch(() => ({}));
        throw new Error(error ?? 'This link was not sent to that email address.');
      }
      if (!optRes.ok) throw new Error('Failed to get authentication options');
      const authResponse = await startAuthentication(await optRes.json());
      const verRes = await fetch('/api/webauthn/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailNorm, token, auth_response: authResponse }),
      });
      if (!verRes.ok) throw new Error('Authentication verification failed');
      setFlowState('success');
    } catch (err: unknown) {
      setFlowState('authenticate');
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
    }
  }, [email, token, lang]);

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
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: '2rem', textAlign: 'center',
    maxWidth: 480, margin: '0 auto', direction: t.dir,
    fontFamily: "'Segoe UI', Arial, sans-serif",
  };
  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '1rem', borderRadius: 12, border: 'none',
    fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', marginTop: '1rem',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem', borderRadius: 8,
    border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box', direction: 'ltr',
  };
  const langBtn: React.CSSProperties = {
    position: 'fixed', top: '1rem',
    [t.dir === 'rtl' ? 'left' : 'right']: '1rem',
    background: '#e0e7ff', border: 'none', borderRadius: '0.5rem',
    padding: '0.3rem 0.7rem', fontSize: '0.82rem', fontWeight: 700,
    cursor: 'pointer', color: '#3730a3',
  };

  const installBanner = pwaInstallable ? (
    <div style={{ marginTop: '2rem', padding: '0.9rem 1rem', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '0.85rem', textAlign: 'center', direction: t.dir }}>
      <p style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', color: '#1e40af' }}>{t.installAppDesc}</p>
      <button onClick={async () => {
        const prompt = (window as any).__pwaPrompt;
        if (!prompt) return;
        await prompt.prompt();
        prompt.userChoice.then(() => { (window as any).__pwaPrompt = null; setPwaInstallable(false); });
      }} style={{ background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
        {t.installApp}
      </button>
    </div>
  ) : null;

  // Request header shown above all interactive states
  const requestHeader = requestDetails && (
    <>
      <div style={{ fontSize: '2.5rem' }}>🔐</div>
      <h1 style={{ fontSize: '1.5rem', marginTop: '1rem', marginBottom: '0.5rem' }}>VeriKey</h1>
      {requestDetails.is_self_registration ? (
        <p style={{ color: '#374151', marginBottom: '1.5rem' }}>
          <strong>{t.selfSetupTitle}</strong><br />
          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>{t.selfSetupDesc}</span>
        </p>
      ) : (
        <>
          <p style={{ color: '#374151', marginBottom: '0.25rem' }}>
            <strong>{t.requesterMsg(requestDetails.requester_name)}</strong>
          </p>
          <p style={{ color: '#6b7280', fontStyle: 'italic', marginBottom: '1.5rem' }}>
            {t.reasonLabel} {requestDetails.message_text}
          </p>
        </>
      )}
    </>
  );

  if (flowState === 'loading') return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      <p style={{ color: '#6b7280' }}>{statusMsg || t.loading}</p>
      {installBanner}
    </main>
  );

  if (flowState === 'expired') return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      <div style={{ fontSize: '3rem' }}>⏰</div>
      <h1 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{t.expired}</h1>
      <p style={{ color: '#6b7280' }}>{t.expiredDesc}</p>
      {installBanner}
    </main>
  );

  if (flowState === 'error') return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <h1 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{t.errorTitle}</h1>
      <p style={{ color: '#6b7280' }}>{errorMsg}</p>
      {installBanner}
    </main>
  );

  if (flowState === 'success') return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      <div style={{ fontSize: '3rem' }}>✅</div>
      <h1 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>
        {requestDetails?.is_self_registration ? t.selfSetupSuccessTitle : t.successTitle}
      </h1>
      <p style={{ color: '#6b7280' }}>
        {requestDetails?.is_self_registration
          ? (firstTimeSetup ? t.selfSetupSuccessDesc : t.selfSetupSuccessDescRepeat)
          : t.successDesc}
      </p>
      {installBanner}
    </main>
  );

  if (flowState === 'declined') return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      <div style={{ fontSize: '3rem' }}>❌</div>
      <h1 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{t.declinedTitle}</h1>
      <p style={{ color: '#6b7280' }}>{t.declinedDesc}</p>
      {installBanner}
    </main>
  );

  return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      {requestHeader}

      {/* Email auto-fill chip */}
      {autoFilledEmail && (flowState === 'register' || flowState === 'register-otp-sent' || flowState === 'authenticate') && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem', background: '#f0f4ff', borderRadius: '0.75rem', padding: '0.5rem 0.9rem' }}>
          <span style={{ fontSize: '1rem' }}>📧</span>
          <span style={{ fontWeight: 600, color: '#1e3a8a', direction: 'ltr' }}>{autoFilledEmail}</span>
          <button onClick={() => { setAutoFilledEmail(''); setEmail(''); setFlowState('email-input'); }}
            style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
            {t.notYou}
          </button>
        </div>
      )}

      {/* Email input */}
      {flowState === 'email-input' && (
        <>
          <p style={{ color: '#374151', marginBottom: '0.5rem' }}>{t.emailPrompt}</p>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()} />
          <button onClick={handleEmailSubmit} style={{ ...btnStyle, background: '#2563eb', color: '#fff' }}>
            {t.continueBtn}
          </button>
        </>
      )}

      {/* Register: first show name + send OTP */}
      {flowState === 'register' && (
        <>
          {!requestDetails?.is_self_registration && (
            <p style={{ color: '#374151', marginBottom: '1rem' }}>{t.noPasskeyDesc}</p>
          )}
          {!autoFilledEmail && (
            <div style={{ width: '100%', marginBottom: '0.75rem' }}>
              <p style={{ color: '#374151', fontSize: '0.88rem', margin: '0 0 0.3rem' }}>{t.labelName}</p>
              <input style={inputStyle} placeholder={t.namePlaceholder} value={displayName}
                onChange={e => setDisplayName(e.target.value)} />
            </div>
          )}
          {errorMsg && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{errorMsg}</p>}
          <button onClick={handleSendRegisterOtp} style={{ ...btnStyle, background: '#059669', color: '#fff' }}>
            {t.sendOtp}
          </button>
          {!requestDetails?.is_self_registration && (
            <button onClick={handleDecline} style={{ ...btnStyle, background: '#f3f4f6', color: '#374151' }}>{t.declineBtn}</button>
          )}
        </>
      )}

      {/* Register: OTP entered, do biometric */}
      {flowState === 'register-otp-sent' && (
        <>
          <p style={{ color: '#374151', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{t.otpSentDesc(email)}</p>
          <input style={{ ...inputStyle, letterSpacing: '0.2em', textAlign: 'center', fontSize: '1.5rem' }}
            type="text" inputMode="numeric" maxLength={6} placeholder={t.otpPlaceholder}
            value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          {errorMsg && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.5rem' }}>{errorMsg}</p>}
          <button onClick={handleRegister} style={{ ...btnStyle, background: '#059669', color: '#fff' }}>
            {t.setupBtn}
          </button>
          <button onClick={handleSendRegisterOtp} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', marginTop: '0.5rem' }}>
            {t.resendOtp}
          </button>
          {!requestDetails?.is_self_registration && (
            <button onClick={handleDecline} style={{ ...btnStyle, background: '#f3f4f6', color: '#374151' }}>{t.declineBtn}</button>
          )}
        </>
      )}

      {/* Authenticate: just biometric */}
      {flowState === 'authenticate' && (
        <>
          {errorMsg && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{errorMsg}</p>}
          <button onClick={handleAuthenticate} style={{ ...btnStyle, background: '#2563eb', color: '#fff', fontSize: '1.2rem', padding: '1.25rem' }}>
            {t.approveBtn}
          </button>
          <button onClick={handleDecline} style={{ ...btnStyle, background: '#f3f4f6', color: '#374151' }}>{t.declineBtn}</button>
        </>
      )}

      {installBanner}
    </main>
  );
}
