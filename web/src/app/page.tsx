'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

// ── Translations ─────────────────────────────────────────────────────────────
const T = {
  he: {
    dir: 'rtl' as const,
    appTagline: 'אימות ביומטרי אישי',
    onboardingTitle: 'ברוך הבא ל־VeriKey',
    onboardingSubtitle: 'הגדר פרופיל כדי לשלוח בקשות אימות',
    labelName: 'השם שלך',
    placeholderName: 'לדוגמה: דוד כהן',
    labelMyEmail: 'האימייל שלך',
    placeholderEmail: 'you@example.com',
    sendOtp: 'שלח קוד אימות',
    otpSentDesc: (email: string) => `שלחנו קוד בן 6 ספרות ל־${email}`,
    labelOtp: 'קוד אימות',
    placeholderOtp: '123456',
    registerBiometric: 'הגדר אימות ביומטרי',
    saveProfile: 'שמור והמשך',
    profileTitle: 'הפרופיל שלי',
    editProfile: 'ערוך פרופיל',
    saveBtn: 'שמור',
    cancelBtn: 'ביטול',
    formTitle: 'שלח בקשת אימות',
    labelRecipientEmail: 'האימייל של הנמען',
    labelMessage: 'הודעה',
    defaultMessage: 'אנא אמת את זהותך כדי שאדע שזה באמת אתה.',
    sendVerification: 'שלח בקשת אימות 📧',
    emailSent: 'הבקשה נשלחה!',
    emailSentDesc: (email: string) => `הקישור נשלח אל ${email}`,
    waitingDesc: (recipient: string) => `ממתין ש־${recipient} יאמת…`,
    pollNote: 'הדף מתעדכן אוטומטית.',
    expired: 'הקישור פג תוקף',
    expiredDesc: 'הנמען לא הגיב בזמן.',
    historyTitle: 'היסטוריית אימותים',
    historyEmpty: 'אין היסטוריה עדיין.',
    statusApproved: 'אושר ✅',
    statusDeclined: 'נדחה ❌',
    statusExpired: 'פג תוקף ⏰',
    sendAnother: 'שלח בקשה נוספת',
    approved: 'זהות אומתה!',
    approvedDesc: (recipient: string) => `${recipient} אישר את זהותו ביומטרית.`,
    declined: 'דחייה',
    declinedDesc: 'הנמען דחה את בקשת האימות.',
    tryAgain: 'נסה שנית',
    errorName: 'יש להזין שם.',
    errorEmail: 'יש להזין כתובת אימייל תקינה.',
    errorRecipientEmail: 'יש להזין כתובת אימייל תקינה של הנמען.',
    errorOtp: 'קוד שגוי או שפג תוקפו.',
    errorMessage: 'יש להזין הודעה.',
    errorGeneric: 'משהו השתבש. אנא נסה שנית.',
    errorNetwork: 'שגיאת רשת. אנא נסה שנית.',
    errorSendFailed: 'שליחת האימייל נכשלה. אנא נסה שנית.',
    passkeySetupTitle: 'הגדרת אימות ביומטרי',
    passkeySetupDesc: 'אמת את האימייל שלך עם OTP, ואז הגדר את מפתח הגישה.',
    passkeySetupBtn: 'שלח קוד אימות להגדרה',
    passkeySetupWaiting: 'ממתין לסיום ההגדרה…',
    passkeyRegistered: 'מפתח גישה רשום ✓',
    passkeyRegisteredDesc: 'מכשיר זה מוגדר לאימות ביומטרי.',
    passkeySuccess: 'מפתח הגישה הוגדר בהצלחה!',
    passkeyError: 'ההגדרה נכשלה. אנא נסה שנית.',
    langLabel: 'EN',
    sendBlockedTitle: 'יש להגדיר אימות ביומטרי תחילה',
    sendBlockedDesc: 'לפני שליחת בקשת אימות לאחרים, עליך להגדיר את מפתח הגישה האישי שלך.',
    signinTitle: 'ברוך שובך!',
    signinDesc: 'האימייל הזה כבר רשום. שלח קוד OTP כדי להתחבר.',
    signinSendOtp: 'שלח קוד כניסה',
    signinBiometric: 'כנס עם Face ID / טביעת אצבע',
    signinSuccess: 'התחברת בהצלחה!',
    errorSignin: 'האימות נכשל. נסה שנית.',
    sending: 'שולח…',
    resendOtp: 'שלח שוב',
  },
  en: {
    dir: 'ltr' as const,
    appTagline: 'Personal biometric authentication',
    onboardingTitle: 'Welcome to VeriKey',
    onboardingSubtitle: 'Set up your profile to send verification requests',
    labelName: 'Your name',
    placeholderName: 'e.g. David Cohen',
    labelMyEmail: 'Your email',
    placeholderEmail: 'you@example.com',
    sendOtp: 'Send verification code',
    otpSentDesc: (email: string) => `We sent a 6-digit code to ${email}`,
    labelOtp: 'Verification code',
    placeholderOtp: '123456',
    registerBiometric: 'Set up biometric',
    saveProfile: 'Save & continue',
    profileTitle: 'My Profile',
    editProfile: 'Edit profile',
    saveBtn: 'Save',
    cancelBtn: 'Cancel',
    formTitle: 'Send a verification request',
    labelRecipientEmail: "Recipient's email",
    labelMessage: 'Message',
    defaultMessage: "Please verify your identity so I know it's really you.",
    sendVerification: 'Send verification request 📧',
    emailSent: 'Request sent!',
    emailSentDesc: (email: string) => `The link was sent to ${email}`,
    waitingDesc: (recipient: string) => `Waiting for ${recipient} to verify…`,
    pollNote: 'This page updates automatically.',
    expired: 'Link Expired',
    expiredDesc: 'The recipient did not respond in time.',
    historyTitle: 'Verification History',
    historyEmpty: 'No history yet.',
    statusApproved: 'Approved ✅',
    statusDeclined: 'Declined ❌',
    statusExpired: 'Expired ⏰',
    sendAnother: 'Send another request',
    approved: 'Identity Verified!',
    approvedDesc: (recipient: string) => `${recipient} confirmed their identity with biometrics.`,
    declined: 'Declined',
    declinedDesc: 'The recipient declined the verification request.',
    tryAgain: 'Try again',
    errorName: 'Enter your name.',
    errorEmail: 'Enter a valid email address.',
    errorRecipientEmail: "Enter a valid recipient email address.",
    errorOtp: 'Incorrect or expired code.',
    errorMessage: 'Enter a message.',
    errorGeneric: 'Something went wrong.',
    errorNetwork: 'Network error. Please try again.',
    errorSendFailed: 'Failed to send the email. Please try again.',
    passkeySetupTitle: 'Set up Biometric Verification',
    passkeySetupDesc: 'Verify your email with an OTP, then set up your passkey.',
    passkeySetupBtn: 'Send verification code for setup',
    passkeySetupWaiting: 'Waiting for setup to complete…',
    passkeyRegistered: 'Passkey registered ✓',
    passkeyRegisteredDesc: 'This device is set up for biometric verification.',
    passkeySuccess: 'Passkey set up successfully!',
    passkeyError: 'Setup failed. Please try again.',
    langLabel: 'עברית',
    sendBlockedTitle: 'Set up your passkey first',
    sendBlockedDesc: 'Before sending a verification request to others, you need to set up your own passkey.',
    signinTitle: 'Welcome back!',
    signinDesc: 'This email is already registered. Send an OTP to sign in.',
    signinSendOtp: 'Send sign-in code',
    signinBiometric: 'Sign in with Face ID / Fingerprint',
    signinSuccess: 'Signed in successfully!',
    errorSignin: 'Authentication failed. Please try again.',
    sending: 'Sending…',
    resendOtp: 'Resend',
  },
} as const;

type Lang = keyof typeof T;
type Step = 'form' | 'sending' | 'sent' | 'approved' | 'declined' | 'expired';

interface HistoryEntry {
  id: string;
  recipient: string;
  sentAt: string;
  status: 'approved' | 'declined' | 'expired';
}

const HISTORY_KEY = 'verikey_history';

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
}

function saveHistory(entry: HistoryEntry) {
  try {
    const prev = loadHistory();
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...prev].slice(0, 10)));
  } catch {}
}

interface Prefs {
  lang?: Lang;
  name?: string;
  email?: string;
  apiToken?: string;
}

function loadPrefs(): Prefs {
  try { return JSON.parse(localStorage.getItem('verikey_prefs') ?? '{}'); } catch { return {}; }
}

function savePrefs(patch: Partial<Prefs>) {
  try {
    localStorage.setItem('verikey_prefs', JSON.stringify({ ...loadPrefs(), ...patch }));
  } catch {}
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [lang, setLang] = useState<Lang>('he');

  // Profile
  const [hasProfile, setHasProfile] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [myName, setMyName] = useState('');
  const [myEmail, setMyEmail] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [apiToken, setApiToken] = useState('');

  // Onboarding OTP sub-flow
  // 'profile' → 'otp-sent' → (biometric) → hasProfile=true
  type OnboardStep = 'profile' | 'otp-sent';
  const [onboardStep, setOnboardStep] = useState<OnboardStep>('profile');
  const [onboardOtpCode, setOnboardOtpCode] = useState('');

  // Sign-in mode (email already registered, new device)
  const [signinMode, setSigninMode] = useState(false);
  const [signinOtpSent, setSigninOtpSent] = useState(false);
  const [signinOtpCode, setSigninOtpCode] = useState('');

  // Send form
  const [step, setStep] = useState<Step>('form');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState('');
  const [sentRecipient, setSentRecipient] = useState('');

  // PWA
  const [pwaInstallable, setPwaInstallable] = useState(false);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Polling
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestIdRef = useRef('');
  const sentRecipientRef = useRef('');
  const expiresAtRef = useRef(0);
  const pollFinishedRef = useRef(false);
  const apiTokenRef = useRef('');

  // Passkey status
  type PasskeyStatus = 'unknown' | 'checking' | 'unregistered' | 'registered' | 'success' | 'error';
  const [passkeyStatus, setPasskeyStatus] = useState<PasskeyStatus>('unknown');
  const [passkeyError, setPasskeyError] = useState('');
  // Setup OTP sub-flow (for users who have a profile but no passkey yet)
  type SetupStep = 'idle' | 'sending-otp' | 'otp-sent' | 'registering' | 'done';
  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const [setupOtpCode, setSetupOtpCode] = useState('');

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const p = loadPrefs();
    const activeLang: Lang = p.lang ?? 'he';
    setLang(activeLang);
    if (p.name && p.email) {
      setMyName(p.name);
      setMyEmail(p.email);
      if (p.apiToken) { setApiToken(p.apiToken); apiTokenRef.current = p.apiToken; }
      setHasProfile(true);
    }
    setMessage(T[activeLang].defaultMessage);
    setHistory(loadHistory());
    if ((window as any).__pwaPrompt) setPwaInstallable(true);
    const onInstallable = () => setPwaInstallable(true);
    window.addEventListener('pwa-installable', onInstallable);
    return () => window.removeEventListener('pwa-installable', onInstallable);
  }, []);

  // ── Ref sync ──────────────────────────────────────────────────────────────
  useEffect(() => { requestIdRef.current = requestId; }, [requestId]);
  useEffect(() => { sentRecipientRef.current = sentRecipient; }, [sentRecipient]);
  useEffect(() => { expiresAtRef.current = expiresAt; }, [expiresAt]);
  useEffect(() => { apiTokenRef.current = apiToken; }, [apiToken]);

  // ── Lang change ───────────────────────────────────────────────────────────
  const prevLangRef = useRef<Lang | null>(null);
  useEffect(() => {
    if (prevLangRef.current === null) { prevLangRef.current = lang; return; }
    prevLangRef.current = lang;
    setMessage(T[lang].defaultMessage);
  }, [lang]);

  // ── Poll for verification result ──────────────────────────────────────────
  useEffect(() => {
    if (step !== 'sent') return;
    pollFinishedRef.current = false;

    function finish(status: 'approved' | 'declined' | 'expired', nextStep: Step) {
      if (pollFinishedRef.current) return;
      pollFinishedRef.current = true;
      clearInterval(pollRef.current!);
      saveHistory({ id: requestIdRef.current, recipient: sentRecipientRef.current, sentAt: new Date().toISOString(), status });
      setHistory(loadHistory());
      setStep(nextStep);
    }

    pollRef.current = setInterval(async () => {
      if (expiresAtRef.current && Date.now() > expiresAtRef.current) {
        finish('expired', 'expired');
        return;
      }
      let statusValue: string | null = null;
      try {
        const res = await fetch(`/api/requests/${requestIdRef.current}/status`, {
          headers: apiTokenRef.current ? { 'Authorization': `Bearer ${apiTokenRef.current}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        statusValue = data.status;
      } catch { return; }
      if (statusValue === 'approved') finish('approved', 'approved');
      else if (statusValue === 'rejected' || statusValue === 'declined') finish('declined', 'declined');
      else if (statusValue === 'expired') finish('expired', 'expired');
    }, 2000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step]);

  // ── Check passkey status ──────────────────────────────────────────────────
  useEffect(() => {
    if (!myEmail || !isValidEmail(myEmail)) return;
    setPasskeyStatus('checking');
    fetch('/api/webauthn/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: myEmail }),
    })
      .then(r => r.json())
      .then(d => setPasskeyStatus(d.registered ? 'registered' : 'unregistered'))
      .catch(() => setPasskeyStatus('unknown'));
  }, [myEmail, hasProfile]);

  const t = T[lang];

  function toggleLang() {
    const next: Lang = lang === 'he' ? 'en' : 'he';
    setLang(next);
    savePrefs({ lang: next });
  }

  // ── Onboarding: send OTP ──────────────────────────────────────────────────
  async function handleSendOnboardOtp() {
    if (!myName.trim()) { setError(t.errorName); return; }
    if (!isValidEmail(myEmail)) { setError(t.errorEmail); return; }
    setError('');

    // Check if already registered — if so, go to sign-in mode
    try {
      const statusRes = await fetch('/api/webauthn/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: myEmail }),
      });
      if (statusRes.ok) {
        const { registered } = await statusRes.json();
        if (registered) { setSigninMode(true); return; }
      }
    } catch {}

    // Send OTP for registration
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: myEmail, purpose: 'register' }),
    });
    if (!res.ok) { setError(t.errorGeneric); return; }
    setOnboardStep('otp-sent');
  }

  // ── Onboarding: verify OTP + register biometric ───────────────────────────
  async function handleRegisterBiometric() {
    if (onboardOtpCode.length !== 6) { setError(t.errorOtp); return; }
    setError('');
    try {
      const optRes = await fetch('/api/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: myEmail, display_name: myName.trim(), otp: onboardOtpCode }),
      });
      if (!optRes.ok) {
        const d = await optRes.json().catch(() => ({}));
        setError(d.error ?? t.errorOtp);
        return;
      }
      const options = await optRes.json();
      const regResponse = await startRegistration(options);
      const verRes = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: myEmail, registration_response: regResponse, otp: onboardOtpCode }),
      });
      if (!verRes.ok) { const d = await verRes.json().catch(() => ({})); setError(d.error ?? t.errorGeneric); return; }
      const verData = await verRes.json();
      const token = verData.api_token ?? '';
      setApiToken(token);
      apiTokenRef.current = token;
      savePrefs({ name: myName.trim(), email: myEmail.trim().toLowerCase(), apiToken: token });
      setHasProfile(true);
      setPasskeyStatus('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.errorGeneric);
    }
  }

  // ── Sign-in: send OTP ─────────────────────────────────────────────────────
  async function handleSendSigninOtp() {
    setError('');
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: myEmail, purpose: 'signin' }),
    });
    if (!res.ok) { setError(t.errorGeneric); return; }
    setSigninOtpSent(true);
  }

  // ── Sign-in: verify OTP + biometric ──────────────────────────────────────
  async function handleSignIn() {
    if (signinOtpCode.length !== 6) { setError(t.errorOtp); return; }
    setError('');
    try {
      const optRes = await fetch('/api/webauthn/auth/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: myEmail, otp: signinOtpCode }),
      });
      if (!optRes.ok) { setError(t.errorSignin); return; }
      const options = await optRes.json();
      const authResponse = await startAuthentication(options);
      const verRes = await fetch('/api/webauthn/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: myEmail, otp: signinOtpCode, auth_response: authResponse }),
      });
      if (!verRes.ok) { setError(t.errorSignin); return; }
      const verData = await verRes.json();
      const name = verData.display_name || myName.trim();
      const token = verData.api_token ?? '';
      setMyName(name);
      setApiToken(token);
      apiTokenRef.current = token;
      savePrefs({ name, email: myEmail.trim().toLowerCase(), apiToken: token });
      setSigninMode(false);
      setHasProfile(true);
      setPasskeyStatus('registered');
    } catch { setError(t.errorSignin); }
  }

  // ── Profile editor ────────────────────────────────────────────────────────
  function openEditor() { setDraftName(myName); setDraftEmail(myEmail); setShowProfileEditor(true); }

  function handleSaveEdit() {
    if (!draftName.trim()) return;
    if (!isValidEmail(draftEmail)) return;
    setMyName(draftName.trim());
    setMyEmail(draftEmail.trim().toLowerCase());
    savePrefs({ name: draftName.trim(), email: draftEmail.trim().toLowerCase() });
    setShowProfileEditor(false);
  }

  // ── Passkey setup for existing profile without passkey ───────────────────
  const handleSendSetupOtp = useCallback(async () => {
    setSetupStep('sending-otp');
    setPasskeyError('');
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: myEmail, purpose: 'register' }),
    });
    if (!res.ok) { setSetupStep('idle'); setPasskeyError(t.passkeyError); return; }
    setSetupStep('otp-sent');
  }, [myEmail, t]);

  async function handleSetupBiometric() {
    if (setupOtpCode.length !== 6) { setPasskeyError(t.errorOtp); return; }
    setSetupStep('registering');
    setPasskeyError('');
    try {
      const optRes = await fetch('/api/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: myEmail, display_name: myName, otp: setupOtpCode }),
      });
      if (!optRes.ok) {
        const d = await optRes.json().catch(() => ({}));
        setPasskeyError(d.error ?? t.passkeyError);
        setSetupStep('otp-sent');
        return;
      }
      const options = await optRes.json();
      const regResponse = await startRegistration(options);
      const verRes = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: myEmail, registration_response: regResponse, otp: setupOtpCode }),
      });
      if (!verRes.ok) {
        const d = await verRes.json().catch(() => ({}));
        setPasskeyError(d.error ?? t.passkeyError);
        setSetupStep('otp-sent');
        return;
      }
      const verData = await verRes.json();
      if (verData.api_token) {
        setApiToken(verData.api_token);
        apiTokenRef.current = verData.api_token;
        savePrefs({ apiToken: verData.api_token });
      }
      setSetupStep('done');
      setPasskeyStatus('success');
    } catch (err: unknown) {
      setPasskeyError(err instanceof Error ? err.message : t.passkeyError);
      setSetupStep('otp-sent');
    }
  }

  // ── Send verification request ─────────────────────────────────────────────
  async function handleSend() {
    setError('');
    if (!isValidEmail(recipientEmail)) { setError(t.errorRecipientEmail); return; }
    if (!message.trim()) { setError(t.errorMessage); return; }
    setStep('sending');
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify({
          recipient_email: recipientEmail.trim().toLowerCase(),
          message_text: message.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t.errorSendFailed);
        setStep('form');
        return;
      }
      const data = await res.json();
      setRequestId(data.id);
      setExpiresAt(data.expires_at ? new Date(data.expires_at).getTime() : Date.now() + 86_400_000);
      setSentRecipient(recipientEmail.trim().toLowerCase());
      setStep('sent');
    } catch {
      setError(t.errorNetwork);
      setStep('form');
    }
  }

  // ── Reset send form ───────────────────────────────────────────────────────
  function handleReset() {
    setStep('form');
    setRequestId('');
    setSentRecipient('');
    setExpiresAt(0);
    setError('');
    setRecipientEmail('');
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.85rem 1rem', fontSize: '1rem',
    border: '1.5px solid #e5e7eb', borderRadius: '0.75rem', outline: 'none',
    boxSizing: 'border-box', background: '#fff', color: '#111',
    direction: 'ltr', textAlign: 'left',
  };
  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '0.9rem', fontSize: '1.05rem', fontWeight: 700,
    background: '#2563eb', color: '#fff', border: 'none',
    borderRadius: '0.75rem', cursor: 'pointer', marginTop: '0.5rem',
  };
  const card: React.CSSProperties = {
    background: '#fff', borderRadius: '1.25rem',
    boxShadow: '0 4px 32px rgba(0,0,0,0.10)', padding: '2rem 1.5rem',
    width: '100%', maxWidth: 420,
    direction: t.dir, textAlign: t.dir === 'rtl' ? 'right' : 'left',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '0.82rem', fontWeight: 600, color: '#374151',
    display: 'block', marginBottom: '0.3rem',
  };
  const fieldGap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.85rem' };

  return (
    <main style={{
      minHeight: '100vh', background: '#f0f4ff',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: '2rem 1rem',
      fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center', width: '100%', maxWidth: 420, position: 'relative' }}>
        <button onClick={toggleLang} style={{
          position: 'absolute', top: 0,
          [t.dir === 'rtl' ? 'left' : 'right']: 0,
          background: '#e0e7ff', border: 'none', borderRadius: '0.5rem',
          padding: '0.3rem 0.7rem', fontSize: '0.82rem', fontWeight: 700,
          cursor: 'pointer', color: '#3730a3',
        }}>{t.langLabel}</button>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🔐</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a8a', margin: 0 }}>VeriKey</h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem', direction: t.dir }}>{t.appTagline}</p>
        {pwaInstallable && (
          <button onClick={async () => {
            const prompt = (window as any).__pwaPrompt;
            if (!prompt) return;
            await prompt.prompt();
            prompt.userChoice.then(() => { (window as any).__pwaPrompt = null; setPwaInstallable(false); });
          }} style={{ marginTop: '0.6rem', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            📲 {lang === 'he' ? 'התקן אפליקציה' : 'Install App'}
          </button>
        )}
      </div>

      {/* ── SIGN-IN (returning user, new device) ── */}
      {!hasProfile && signinMode && (
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem' }}>👋</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.5rem 0 0.25rem', color: '#111' }}>{t.signinTitle}</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 0.25rem', direction: 'ltr' }}>{myEmail}</p>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>{t.signinDesc}</p>
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: '0 0 0.75rem', textAlign: 'center' }}>{error}</p>}
          {!signinOtpSent ? (
            <button style={btnPrimary} onClick={handleSendSigninOtp}>{t.signinSendOtp}</button>
          ) : (
            <div style={fieldGap}>
              <p style={{ color: '#374151', fontSize: '0.875rem', margin: 0 }}>{t.otpSentDesc(myEmail)}</p>
              <div>
                <label style={labelStyle}>{t.labelOtp}</label>
                <input style={{ ...inputStyle, letterSpacing: '0.2em', textAlign: 'center', fontSize: '1.5rem' }}
                  type="text" inputMode="numeric" maxLength={6}
                  placeholder={t.placeholderOtp}
                  value={signinOtpCode} onChange={e => setSigninOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              </div>
              <button style={btnPrimary} onClick={handleSignIn}>{t.signinBiometric}</button>
              <button onClick={handleSendSigninOtp} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>{t.resendOtp}</button>
            </div>
          )}
          <button onClick={() => { setSigninMode(false); setSigninOtpSent(false); setSigninOtpCode(''); setError(''); }} style={{
            width: '100%', marginTop: '0.75rem', background: 'transparent', border: 'none',
            color: '#6b7280', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline',
          }}>
            {lang === 'he' ? 'חזור' : 'Back'}
          </button>
        </div>
      )}

      {/* ── ONBOARDING ── */}
      {!hasProfile && !signinMode && (
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem' }}>👤</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.5rem 0 0.25rem', color: '#111' }}>{t.onboardingTitle}</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>{t.onboardingSubtitle}</p>
          </div>

          {onboardStep === 'profile' && (
            <div style={fieldGap}>
              <div>
                <label style={labelStyle}>{t.labelName}</label>
                <input style={inputStyle} placeholder={t.placeholderName} value={myName} onChange={e => setMyName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{t.labelMyEmail}</label>
                <input style={inputStyle} type="email" placeholder={t.placeholderEmail} value={myEmail} onChange={e => setMyEmail(e.target.value)} />
              </div>
              {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{error}</p>}
              <button style={btnPrimary} onClick={handleSendOnboardOtp}>{t.sendOtp}</button>
            </div>
          )}

          {onboardStep === 'otp-sent' && (
            <div style={fieldGap}>
              <p style={{ color: '#374151', fontSize: '0.875rem', margin: 0 }}>{t.otpSentDesc(myEmail)}</p>
              <div>
                <label style={labelStyle}>{t.labelOtp}</label>
                <input style={{ ...inputStyle, letterSpacing: '0.2em', textAlign: 'center', fontSize: '1.5rem' }}
                  type="text" inputMode="numeric" maxLength={6}
                  placeholder={t.placeholderOtp}
                  value={onboardOtpCode} onChange={e => setOnboardOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              </div>
              {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{error}</p>}
              <button style={btnPrimary} onClick={handleRegisterBiometric}>{t.registerBiometric}</button>
              <button onClick={() => { setOnboardStep('profile'); setError(''); setOnboardOtpCode(''); }}
                style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                {lang === 'he' ? 'חזור' : 'Back'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PROFILE EDITOR MODAL ── */}
      {hasProfile && showProfileEditor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ ...card, maxWidth: 380, boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1.25rem', color: '#111' }}>{t.profileTitle}</h2>
            <div style={fieldGap}>
              <div>
                <label style={labelStyle}>{t.labelName}</label>
                <input style={inputStyle} value={draftName} onChange={e => setDraftName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{t.labelMyEmail}</label>
                <input style={inputStyle} type="email" value={draftEmail} onChange={e => setDraftEmail(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button onClick={handleSaveEdit} style={{ ...btnPrimary, marginTop: 0, flex: 1 }}>{t.saveBtn}</button>
                <button onClick={() => setShowProfileEditor(false)} style={{ flex: 1, padding: '0.9rem', fontSize: '1rem', fontWeight: 600, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '0.75rem', cursor: 'pointer' }}>{t.cancelBtn}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN SEND CARD ── */}
      {hasProfile && (
        <div style={card}>
          {/* Profile chip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0f4ff', borderRadius: '0.75rem', padding: '0.6rem 0.9rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>👤</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e3a8a' }}>{myName}</div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', direction: 'ltr' }}>{myEmail}</div>
              </div>
            </div>
            <button onClick={openEditor} style={{ background: 'none', border: '1.5px solid #c7d2fe', borderRadius: '0.5rem', padding: '0.3rem 0.65rem', fontSize: '0.78rem', fontWeight: 600, color: '#4338ca', cursor: 'pointer' }}>
              ✏️ {t.editProfile}
            </button>
          </div>

          {/* ── Passkey setup panel ── */}
          {step === 'form' && passkeyStatus === 'unregistered' && setupStep === 'idle' && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '0.85rem', padding: '1rem 1.1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e40af', marginBottom: '0.25rem' }}>🔑 {t.passkeySetupTitle}</div>
              <p style={{ color: '#374151', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>{t.passkeySetupDesc}</p>
              <button onClick={handleSendSetupOtp} style={{ ...btnPrimary, marginTop: 0, fontSize: '0.88rem', padding: '0.65rem' }}>{t.passkeySetupBtn}</button>
            </div>
          )}

          {step === 'form' && passkeyStatus === 'unregistered' && setupStep === 'sending-otp' && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '0.85rem', padding: '0.85rem 1.1rem', marginBottom: '1.25rem', textAlign: 'center', color: '#1e40af', fontSize: '0.88rem' }}>
              ⏳ {lang === 'he' ? 'שולח קוד…' : 'Sending code…'}
            </div>
          )}

          {step === 'form' && passkeyStatus === 'unregistered' && setupStep === 'otp-sent' && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '0.85rem', padding: '1rem 1.1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e40af', marginBottom: '0.5rem' }}>📧 {t.otpSentDesc(myEmail)}</div>
              {passkeyError && <p style={{ color: '#dc2626', fontSize: '0.82rem', margin: '0 0 0.5rem' }}>{passkeyError}</p>}
              <input style={{ ...inputStyle, letterSpacing: '0.2em', textAlign: 'center', fontSize: '1.5rem', marginBottom: '0.5rem' }}
                type="text" inputMode="numeric" maxLength={6} placeholder={t.placeholderOtp}
                value={setupOtpCode} onChange={e => setSetupOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              <button onClick={handleSetupBiometric} style={{ ...btnPrimary, marginTop: '0.25rem', fontSize: '0.88rem', padding: '0.65rem' }}>{t.registerBiometric}</button>
            </div>
          )}

          {step === 'form' && passkeyStatus === 'unregistered' && setupStep === 'registering' && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '0.85rem', padding: '0.85rem 1.1rem', marginBottom: '1.25rem', textAlign: 'center', color: '#1e40af', fontSize: '0.88rem' }}>
              ⏳ {t.passkeySetupWaiting}
            </div>
          )}

          {step === 'form' && (passkeyStatus === 'registered' || passkeyStatus === 'success') && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '0.85rem', padding: '0.75rem 1.1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#15803d' }}>
                {passkeyStatus === 'success' ? t.passkeySuccess : t.passkeyRegistered}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{t.passkeyRegisteredDesc}</div>
            </div>
          )}

          {step === 'form' && passkeyStatus === 'error' && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '0.85rem', padding: '0.75rem 1.1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#dc2626', marginBottom: '0.25rem' }}>⚠️ {t.passkeyError}</div>
              <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0 0 0.5rem' }}>{passkeyError}</p>
              <button onClick={() => { setPasskeyStatus('unregistered'); setSetupStep('idle'); setPasskeyError(''); }}
                style={{ background: 'none', border: '1.5px solid #fca5a5', borderRadius: '0.5rem', padding: '0.3rem 0.65rem', fontSize: '0.78rem', fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}>
                {lang === 'he' ? 'נסה שנית' : 'Try again'}
              </button>
            </div>
          )}

          {/* Blocked: passkey not set up yet */}
          {step === 'form' && passkeyStatus !== 'registered' && passkeyStatus !== 'success' && passkeyStatus !== 'checking' && passkeyStatus !== 'unknown' && (
            <div style={{ background: '#fef9c3', border: '1.5px solid #fde68a', borderRadius: '0.85rem', padding: '0.85rem 1.1rem', marginBottom: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#92400e', marginBottom: '0.25rem' }}>🔒 {t.sendBlockedTitle}</div>
              <p style={{ color: '#78350f', fontSize: '0.82rem', margin: 0 }}>{t.sendBlockedDesc}</p>
            </div>
          )}

          {/* ── Send form ── */}
          {step === 'form' && (passkeyStatus === 'registered' || passkeyStatus === 'success') && (
            <>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#111', marginTop: 0 }}>{t.formTitle}</h2>
              <div style={fieldGap}>
                <div>
                  <label style={labelStyle}>{t.labelRecipientEmail}</label>
                  <input style={inputStyle} type="email" placeholder={t.placeholderEmail}
                    value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>{t.labelMessage}</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 } as React.CSSProperties}
                    value={message} onChange={e => setMessage(e.target.value)} />
                </div>
                {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{error}</p>}
                <button style={btnPrimary} onClick={handleSend}>{t.sendVerification}</button>
              </div>
            </>
          )}

          {/* Sending spinner */}
          {step === 'sending' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
              <p style={{ color: '#6b7280' }}>{t.sending}</p>
            </div>
          )}

          {/* Sent / waiting */}
          {step === 'sent' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '2.5rem' }}>✅</div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>{t.emailSent}</h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{t.emailSentDesc(sentRecipient)}</p>
              </div>
              <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: '#fef9c3', borderRadius: '0.75rem', fontSize: '0.875rem', color: '#854d0e', textAlign: 'center' }}>
                ⏳ {t.waitingDesc(sentRecipient)}<br />
                <span style={{ fontSize: '0.8rem', color: '#92400e' }}>{t.pollNote}</span>
              </div>
              <button onClick={handleReset} style={{ width: '100%', marginTop: '1rem', background: 'transparent', border: 'none', color: '#6b7280', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
                {t.sendAnother}
              </button>
            </>
          )}

          {/* Approved */}
          {step === 'approved' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', marginBottom: '0.5rem' }}>{t.approved}</h2>
              <p style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{t.approvedDesc(sentRecipient)}</p>
              <button style={btnPrimary} onClick={handleReset}>{t.sendAnother}</button>
            </div>
          )}

          {/* Declined */}
          {step === 'declined' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>❌</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#dc2626', marginBottom: '0.5rem' }}>{t.declined}</h2>
              <p style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{t.declinedDesc}</p>
              <button style={btnPrimary} onClick={handleReset}>{t.tryAgain}</button>
            </div>
          )}

          {/* Expired */}
          {step === 'expired' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⏰</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#d97706', marginBottom: '0.5rem' }}>{t.expired}</h2>
              <p style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{t.expiredDesc}</p>
              <button style={btnPrimary} onClick={handleReset}>{t.tryAgain}</button>
            </div>
          )}
        </div>
      )}

      {/* ── History ── */}
      {history.length > 0 && (
        <div style={{ width: '100%', maxWidth: 420, marginTop: '1.25rem' }}>
          <button onClick={() => setShowHistory(h => !h)}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: t.dir === 'rtl' ? 'right' : 'left', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600, padding: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>{showHistory ? '▾' : '▸'}</span>
            <span>{t.historyTitle} ({history.length})</span>
          </button>
          {showHistory && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {history.map((h, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: '0.6rem', padding: '0.6rem 0.9rem', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', direction: t.dir }}>
                  <span style={{ color: '#374151', fontWeight: 500 }}>{h.recipient}</span>
                  <span style={{ color: '#9ca3af', marginInline: '0.5rem', flexShrink: 0 }}>
                    {new Date(h.sentAt).toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontWeight: 700, color: h.status === 'approved' ? '#16a34a' : h.status === 'declined' ? '#dc2626' : '#d97706', flexShrink: 0 }}>
                    {h.status === 'approved' ? t.statusApproved : h.status === 'declined' ? t.statusDeclined : t.statusExpired}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
