'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { useRouter } from 'next/navigation';

// ── Translations ─────────────────────────────────────────────────────────────
const T = {
  he: {
    dir: 'rtl' as const,
    loading: 'טוען…',
    expired: 'הקישור פג תוקף',
    expiredDesc: 'קישור האימות פג תוקף. בקש מהשולח לשלוח קישור חדש.',
    answerExpiredDesc: 'חלון הזמן למתן תשובה פג. בקש מהשולח לשלוח קישור חדש.',
    errorTitle: 'משהו השתבש',
    successTitle: 'זהות אומתה ✅',
    successDesc: 'תגובתך נרשמה ואומתה ביומטרית.',
    successYes: 'אישרת את הפעולה.',
    successNo: 'דחית את הפעולה. הודעת אזהרה נשלחה לשולח.',
    selfSetupSuccessTitle: 'האימות הביומטרי הוגדר!',
    selfSetupSuccessDesc: 'מעכשיו תוכל לאשר בקשות אימות בלחיצה אחת.',
    selfSetupSuccessDescRepeat: 'מפתח הגישה עודכן בהצלחה.',
    declinedTitle: 'דחייה',
    declinedDesc: 'דחית את בקשת האימות.',
    requesterQuestion: (name: string) => `${name} שואל אותך:`,
    selfSetupTitle: 'הגדרת VeriKey',
    selfSetupDesc: 'לחץ כדי להגדיר אימות ביומטרי במכשיר זה.',
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
    answerYes: '✅ כן, זה אני',
    answerNo: '❌ לא, לא עשיתי זאת',
    answerPrompt: 'ענה בכנות — האימות הביומטרי יוכיח שהתגובה היא שלך.',
    notePlaceholder: 'הוסף הערה (אופציונלי)…',
    verifyBtn: 'אמת עם Face ID / טביעת אצבע',
    declineBtn: 'דחה (ללא אימות)',
    installApp: 'התקן אפליקציה 📲',
    installAppDesc: 'התקן את האפליקציה כדי שתוכל להשתמש בה לאימות אחרים.',
    langLabel: 'EN',
    notYou: 'זה לא אתה?',
    resendOtp: 'שלח שוב',
    timeLimitNote: (min: number) => `יש לענות תוך ${min} דקות מרגע פתיחת הקישור.`,
    timeLeft: (s: number) => `נותרו ${s} שניות`,
  },
  en: {
    dir: 'ltr' as const,
    loading: 'Loading…',
    expired: 'Link Expired',
    expiredDesc: 'This verification link has expired. Please ask the requester to send a new one.',
    answerExpiredDesc: 'The answer time window has expired. Please ask the requester to send a new link.',
    errorTitle: 'Something went wrong',
    successTitle: 'Identity Confirmed ✅',
    successDesc: 'Your response has been recorded and verified biometrically.',
    successYes: 'You confirmed the action.',
    successNo: 'You denied the action. A warning has been sent to the requester.',
    selfSetupSuccessTitle: 'Biometric verification is set up!',
    selfSetupSuccessDesc: 'You can now approve verification requests in one tap.',
    selfSetupSuccessDescRepeat: 'Your passkey has been updated successfully.',
    declinedTitle: 'Declined',
    declinedDesc: 'You declined this verification request.',
    requesterQuestion: (name: string) => `${name} is asking:`,
    selfSetupTitle: 'Set up VeriKey',
    selfSetupDesc: 'Tap below to register your biometric on this device.',
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
    answerYes: '✅ Yes, that was me',
    answerNo: '❌ No, I didn\'t do that',
    answerPrompt: 'Answer honestly — your biometric will prove this response is from you.',
    notePlaceholder: 'Add a note (optional)…',
    verifyBtn: 'Verify with Face ID / Fingerprint',
    declineBtn: 'Decline (no biometric)',
    installApp: 'Install App 📲',
    installAppDesc: 'Install the app so you can use it to verify others.',
    langLabel: 'עברית',
    notYou: 'Not you?',
    resendOtp: 'Resend',
    timeLimitNote: (min: number) => `You have ${min} minutes from opening this link to answer.`,
    timeLeft: (s: number) => `${s} seconds remaining`,
  },
} as const;

type Lang = keyof typeof T;
type RequestDetails = {
  requester_name: string;
  message_text: string;
  status: string;
  is_self_registration: boolean;
  answer_deadline: string;
  answer_expired: boolean;
};
type FlowState =
  | 'idle' | 'loading' | 'email-input'
  | 'answer'           // new: pick yes/no + optional note
  | 'register' | 'register-otp-sent' | 'authenticate'
  | 'success' | 'declined' | 'expired' | 'answer-expired' | 'error';

export default function VerifyPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
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

  // Answer state
  const [selectedAnswer, setSelectedAnswer] = useState<'yes' | 'no' | null>(null);
  const [noteText, setNoteText] = useState('');
  const [answeredWith, setAnsweredWith] = useState<'yes' | 'no' | null>(null);

  // Time-lock countdown
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if ((window as any).__pwaPrompt) setPwaInstallable(true);
    const onInstallable = () => setPwaInstallable(true);
    window.addEventListener('pwa-installable', onInstallable);
    return () => window.removeEventListener('pwa-installable', onInstallable);
  }, []);

  useEffect(() => {
    async function init() {
      let savedEmail = '';
      try {
        const prefs = JSON.parse(localStorage.getItem('verikey_prefs') ?? '{}');
        if (prefs.lang) setLang(prefs.lang);
        if (prefs.email) { savedEmail = prefs.email; setEmail(prefs.email); }
        if (prefs.name) setDisplayName(prefs.name);
      } catch {}

      try {
        const res = await fetch(`/api/verify/${token}`);
        if (res.status === 410) { setFlowState('expired'); return; }
        if (!res.ok) { setFlowState('error'); setErrorMsg('Verification link not found or invalid.'); return; }
        const data: RequestDetails = await res.json();
        setRequestDetails(data);

        if (data.status === 'approved') { setFlowState('success'); return; }
        if (data.status === 'rejected') { setFlowState('declined'); return; }
        if (data.answer_expired) { setFlowState('answer-expired'); return; }

        // Start countdown timer
        const deadline = new Date(data.answer_deadline).getTime();
        const tick = () => {
          const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
          setSecondsLeft(remaining);
          if (remaining === 0) {
            clearInterval(countdownRef.current!);
            setFlowState('answer-expired');
          }
        };
        tick();
        countdownRef.current = setInterval(tick, 1000);

        if (!data.is_self_registration) {
          // For normal verification requests, go to answer step first
          if (savedEmail) {
            setAutoFilledEmail(savedEmail);
          }
          setFlowState('answer');
        } else {
          // Self-registration skips the answer step
          if (savedEmail) {
            setAutoFilledEmail(savedEmail);
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
        }
      } catch {
        setFlowState('error');
        setErrorMsg('Failed to load verification request.');
      }
    }
    init();
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [token]);

  // Redirect home after success or decline
  useEffect(() => {
    if (flowState !== 'success' && flowState !== 'declined') return;
    const id = setTimeout(() => router.push('/'), 3000);
    return () => clearTimeout(id);
  }, [flowState, router]);

  const t = T[lang];
  function toggleLang() { setLang(l => l === 'he' ? 'en' : 'he'); }

  // After choosing answer, submit it and move to biometric
  const handleAnswerSubmit = useCallback(async () => {
    if (!selectedAnswer) return;
    setErrorMsg('');

    try {
      const res = await fetch(`/api/verify/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_answer', answer: selectedAnswer, note: noteText }),
      });
      if (res.status === 410) { setFlowState('answer-expired'); return; }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrorMsg(d.error ?? 'Something went wrong.');
        return;
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      return;
    }

    setAnsweredWith(selectedAnswer);

    // Now proceed to biometric
    if (autoFilledEmail) {
      const authRes = await fetch('/api/webauthn/auth/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: autoFilledEmail, token }),
      });
      if (authRes.status === 404) setFlowState('register');
      else if (authRes.ok) setFlowState('authenticate');
      else setFlowState('email-input');
    } else {
      setFlowState('email-input');
    }
  }, [selectedAnswer, noteText, token, autoFilledEmail]);

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
      const emailNorm = (autoFilledEmail || email).trim().toLowerCase();
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
  }, [email, autoFilledEmail, token, lang]);

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

  // Countdown badge
  const countdownBadge = secondsLeft !== null && flowState === 'answer' ? (
    <div style={{
      display: 'inline-block', background: secondsLeft < 60 ? '#fef2f2' : '#f0f4ff',
      border: `1.5px solid ${secondsLeft < 60 ? '#fecaca' : '#c7d2fe'}`,
      borderRadius: '0.5rem', padding: '0.25rem 0.6rem', fontSize: '0.78rem',
      color: secondsLeft < 60 ? '#dc2626' : '#3730a3', fontWeight: 600, marginBottom: '0.75rem',
    }}>
      ⏱ {t.timeLeft(secondsLeft)}
    </div>
  ) : null;

  // Question box — shown during answer step and auth steps
  const questionBox = requestDetails && !requestDetails.is_self_registration && (
    <div style={{ width: '100%', marginBottom: '1.25rem' }}>
      <p style={{ color: '#374151', fontSize: '0.88rem', margin: '0 0 0.5rem', fontWeight: 600 }}>
        {t.requesterQuestion(requestDetails.requester_name)}
      </p>
      <div style={{ background: '#f0f4ff', border: '1.5px solid #c7d2fe', borderRadius: '0.85rem', padding: '0.85rem 1rem' }}>
        <p style={{ color: '#1e3a8a', fontWeight: 700, fontSize: '1.05rem', margin: 0, fontStyle: 'italic' }}>
          "{requestDetails.message_text}"
        </p>
      </div>
    </div>
  );

  if (flowState === 'loading') return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      <p style={{ color: '#6b7280' }}>{statusMsg || t.loading}</p>
    </main>
  );

  if (flowState === 'expired' || flowState === 'answer-expired') return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      <div style={{ fontSize: '3rem' }}>⏰</div>
      <h1 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{t.expired}</h1>
      <p style={{ color: '#6b7280' }}>{flowState === 'answer-expired' ? t.answerExpiredDesc : t.expiredDesc}</p>
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

  if (flowState === 'success') {
    const isSelfSetup = requestDetails?.is_self_registration;
    const answeredNo = answeredWith === 'no';
    return (
      <main style={containerStyle}>
        <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
        <div style={{ fontSize: '3rem' }}>{answeredNo ? '🚨' : '✅'}</div>
        <h1 style={{ fontSize: '1.5rem', marginTop: '1rem', color: answeredNo ? '#dc2626' : '#15803d' }}>
          {isSelfSetup ? t.selfSetupSuccessTitle : t.successTitle}
        </h1>
        <p style={{ color: '#374151' }}>
          {isSelfSetup
            ? (firstTimeSetup ? t.selfSetupSuccessDesc : t.selfSetupSuccessDescRepeat)
            : (answeredNo ? t.successNo : t.successYes)}
        </p>
        {answeredNo && (
          <div style={{ marginTop: '1rem', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '0.85rem', padding: '0.85rem 1rem' }}>
            <p style={{ color: '#dc2626', fontSize: '0.88rem', margin: 0, fontWeight: 600 }}>
              ⚠️ {lang === 'he' ? 'הודעת אזהרה נשלחה לשולח.' : 'An alert has been sent to the requester.'}
            </p>
          </div>
        )}
        {installBanner}
      </main>
    );
  }

  if (flowState === 'declined') return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      <div style={{ fontSize: '3rem' }}>⚪</div>
      <h1 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{t.declinedTitle}</h1>
      <p style={{ color: '#6b7280' }}>{t.declinedDesc}</p>
      {installBanner}
    </main>
  );

  return (
    <main style={containerStyle}>
      <button style={langBtn} onClick={toggleLang}>{t.langLabel}</button>
      <div style={{ fontSize: '2.5rem' }}>🔐</div>
      <h1 style={{ fontSize: '1.5rem', margin: '0.75rem 0 1.25rem' }}>VeriKey</h1>

      {/* Self-setup header */}
      {requestDetails?.is_self_registration && (
        <p style={{ color: '#374151', marginBottom: '1.5rem' }}>
          <strong>{t.selfSetupTitle}</strong><br />
          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>{t.selfSetupDesc}</span>
        </p>
      )}

      {/* ── ANSWER STEP ── */}
      {flowState === 'answer' && (
        <>
          {countdownBadge}
          {questionBox}
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1rem' }}>{t.answerPrompt}</p>

          {/* Yes / No buttons */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button
              onClick={() => setSelectedAnswer('yes')}
              style={{
                ...btnStyle, marginTop: 0,
                background: selectedAnswer === 'yes' ? '#dcfce7' : '#f9fafb',
                border: `2px solid ${selectedAnswer === 'yes' ? '#16a34a' : '#e5e7eb'}`,
                color: selectedAnswer === 'yes' ? '#15803d' : '#374151',
                fontSize: '1.05rem', fontWeight: 700,
              }}>
              {t.answerYes}
            </button>
            <button
              onClick={() => setSelectedAnswer('no')}
              style={{
                ...btnStyle, marginTop: 0,
                background: selectedAnswer === 'no' ? '#fef2f2' : '#f9fafb',
                border: `2px solid ${selectedAnswer === 'no' ? '#dc2626' : '#e5e7eb'}`,
                color: selectedAnswer === 'no' ? '#dc2626' : '#374151',
                fontSize: '1.05rem', fontWeight: 700,
              }}>
              {t.answerNo}
            </button>
          </div>

          {/* Optional note */}
          {selectedAnswer && (
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder={t.notePlaceholder}
              rows={2}
              style={{ ...inputStyle, marginTop: '0.85rem', resize: 'none', fontSize: '0.95rem', direction: t.dir } as React.CSSProperties}
            />
          )}

          {errorMsg && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.5rem' }}>{errorMsg}</p>}

          <button
            onClick={handleAnswerSubmit}
            disabled={!selectedAnswer}
            style={{
              ...btnStyle,
              background: selectedAnswer ? '#2563eb' : '#e5e7eb',
              color: selectedAnswer ? '#fff' : '#9ca3af',
              cursor: selectedAnswer ? 'pointer' : 'not-allowed',
              fontSize: '1.1rem',
            }}>
            {t.verifyBtn}
          </button>

          <button onClick={handleDecline}
            style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', marginTop: '0.75rem' }}>
            {t.declineBtn}
          </button>
        </>
      )}

      {/* Email auto-fill chip */}
      {autoFilledEmail && (flowState === 'email-input' || flowState === 'register' || flowState === 'register-otp-sent' || flowState === 'authenticate') && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem', background: '#f0f4ff', borderRadius: '0.75rem', padding: '0.5rem 0.9rem' }}>
          <span>📧</span>
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
          {questionBox}
          <p style={{ color: '#374151', marginBottom: '0.5rem' }}>{t.emailPrompt}</p>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder} style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()} />
          <button onClick={handleEmailSubmit} style={{ ...btnStyle, background: '#2563eb', color: '#fff' }}>
            {t.continueBtn}
          </button>
        </>
      )}

      {/* Register: send OTP */}
      {flowState === 'register' && (
        <>
          {!requestDetails?.is_self_registration && <p style={{ color: '#374151', marginBottom: '1rem' }}>{t.noPasskeyDesc}</p>}
          {!autoFilledEmail && (
            <div style={{ width: '100%', marginBottom: '0.75rem' }}>
              <p style={{ color: '#374151', fontSize: '0.88rem', margin: '0 0 0.3rem' }}>{t.labelName}</p>
              <input style={inputStyle} placeholder={t.namePlaceholder} value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
          )}
          {errorMsg && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{errorMsg}</p>}
          <button onClick={handleSendRegisterOtp} style={{ ...btnStyle, background: '#059669', color: '#fff' }}>{t.sendOtp}</button>
          {!requestDetails?.is_self_registration && (
            <button onClick={handleDecline} style={{ ...btnStyle, background: '#f3f4f6', color: '#374151' }}>{t.declineBtn}</button>
          )}
        </>
      )}

      {/* Register: OTP entered, biometric */}
      {flowState === 'register-otp-sent' && (
        <>
          <p style={{ color: '#374151', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{t.otpSentDesc(email)}</p>
          <input style={{ ...inputStyle, letterSpacing: '0.2em', textAlign: 'center', fontSize: '1.5rem' }}
            type="text" inputMode="numeric" maxLength={6} placeholder={t.otpPlaceholder}
            value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          {errorMsg && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.5rem' }}>{errorMsg}</p>}
          <button onClick={handleRegister} style={{ ...btnStyle, background: '#059669', color: '#fff' }}>{t.setupBtn}</button>
          <button onClick={handleSendRegisterOtp} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', marginTop: '0.5rem' }}>
            {t.resendOtp}
          </button>
          {!requestDetails?.is_self_registration && (
            <button onClick={handleDecline} style={{ ...btnStyle, background: '#f3f4f6', color: '#374151' }}>{t.declineBtn}</button>
          )}
        </>
      )}

      {/* Authenticate: biometric */}
      {flowState === 'authenticate' && (
        <>
          {questionBox}
          {answeredWith && (
            <div style={{
              width: '100%', marginBottom: '1rem', padding: '0.65rem 1rem',
              background: answeredWith === 'yes' ? '#f0fdf4' : '#fef2f2',
              border: `1.5px solid ${answeredWith === 'yes' ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: '0.75rem', fontWeight: 700, fontSize: '0.95rem',
              color: answeredWith === 'yes' ? '#15803d' : '#dc2626',
            }}>
              {answeredWith === 'yes' ? t.answerYes : t.answerNo}
            </div>
          )}
          {errorMsg && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{errorMsg}</p>}
          <button onClick={handleAuthenticate} style={{ ...btnStyle, background: '#2563eb', color: '#fff', fontSize: '1.2rem', padding: '1.25rem' }}>
            {t.verifyBtn}
          </button>
          <button onClick={handleDecline} style={{ ...btnStyle, background: '#f3f4f6', color: '#374151' }}>{t.declineBtn}</button>
        </>
      )}

      {installBanner}
    </main>
  );
}
