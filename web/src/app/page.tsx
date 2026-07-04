'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Translations ────────────────────────────────────────────────────────────
const T = {
  he: {
    dir: 'rtl' as const,
    appTagline: 'אימות זהות ביומטרי — ללא התקנת אפליקציה',
    // Onboarding
    onboardingTitle: 'ברוך הבא ל־VeriKey',
    onboardingSubtitle: 'הגדר פרופיל כדי לשלוח בקשות אימות',
    labelName: 'השם שלך',
    placeholderName: 'לדוגמה: דוד כהן',
    labelMyPhone: 'מספר הטלפון שלך',
    labelMyEmail: 'האימייל שלך (אופציונלי)',
    placeholderEmail: 'you@example.com',
    saveProfile: 'שמור והמשך',
    // Profile area
    profileTitle: 'הפרופיל שלי',
    editProfile: 'ערוך פרופיל',
    saveBtn: 'שמור',
    cancelBtn: 'ביטול',
    // Send form
    formTitle: 'שלח בקשת אימות',
    labelRecipientPhone: 'מספר הטלפון של הנמען',
    labelRecipientEmail: 'האימייל של הנמען',
    pickContact: 'בחר מאנשי קשר',
    pickNumber: 'בחר מספר:',
    labelMessage: 'הודעה',
    defaultMessage: 'אנא אמת את זהותך כדי שאדע שזה באמת אתה.',
    emailSubject: 'בקשה לאימות זהות',
    sendWhatsApp: 'שלח דרך WhatsApp 💬',
    sendSMS: 'שלח דרך SMS 📱',
    sendEmail: 'שלח דרך אימייל 📧',
    emailSent: 'האימייל נשלח!',
    appOpened: (app: string) => `פתח את ${app} ושלח את ההודעה`,
    appOpenedNote: 'לאחר שתשלח — חזור לכאן. הדף יתעדכן אוטומטית.',
    waitingDesc: (recipient: string) => `ממתין ש־${recipient} יאמת…`,
    pollNote: 'הדף מתעדכן אוטומטית. הקישור תקף דקה אחת.',
    expired: 'הקישור פג תוקף',
    expiredDesc: 'הנמען לא הגיב בתוך דקה.',
    historyTitle: 'היסטוריית אימותים',
    historyEmpty: 'אין היסטוריה עדיין.',
    statusApproved: 'אושר ✅',
    statusDeclined: 'נדחה ❌',
    statusExpired: 'פג תוקף ⏰',
    statusPending: 'ממתין…',
    verifyLinkLabel: 'קישור אימות:',
    sendAnother: 'שלח בקשה נוספת',
    approved: 'זהות אומתה!',
    approvedDesc: (recipient: string) => `${recipient} אישר את זהותו ביומטרית.`,
    declined: 'דחייה',
    declinedDesc: 'הנמען דחה את בקשת האימות.',
    tryAgain: 'נסה שנית',
    errorName: 'יש להזין שם.',
    errorMyPhone: 'יש להזין מספר טלפון תקין.',
    errorRecipientPhone: 'יש להזין את מספר הטלפון של הנמען.',
    errorRecipientEmail: 'יש להזין כתובת אימייל תקינה של הנמען.',
    errorMessage: 'יש להזין הודעה.',
    errorGeneric: 'משהו השתבש. אנא נסה שנית.',
    errorNetwork: 'שגיאת רשת. אנא נסה שנית.',
    privacy: 'מספרי הטלפון מועברים ב־HTTPS ומגובבים בשרת עם מפתח סודי — לא נשמרים בטקסט גלוי.\nאימות ביומטרי מבוסס על WebAuthn / Passkeys — ללא סיסמה.',
    passkeySetupTitle: 'הגדרת אימות ביומטרי',
    passkeySetupDesc: 'לאימות בקשות עתידיות בלחיצה אחת, הגדר מפתח גישה. נשלח אליך קישור הגדרה.',
    passkeySetupBtn: 'שלח קישור הגדרה ל-WhatsApp',
    passkeySetupBtnSms: 'שלח קישור הגדרה ב-SMS',
    passkeySetupSent: 'פתח את WhatsApp ושלח את ההודעה — לאחר מכן לחץ על הקישור שתקבל.',
    passkeySetupSentSms: 'פתח את ה-SMS ושלח את ההודעה — לאחר מכן לחץ על הקישור שתקבל.',
    passkeySetupWaiting: 'ממתין לסיום ההגדרה…',
    passkeyRegistered: 'מפתח גישה רשום ✓',
    passkeyRegisteredDesc: 'מכשיר זה מוגדר לאימות ביומטרי.',
    passkeySuccess: 'מפתח הגישה הוגדר בהצלחה!',
    passkeyError: 'ההגדרה נכשלה. אנא נסה שנית.',
    langLabel: 'EN',
    defaultCountryCode: '+972',
    sending: 'יוצר קישור אימות…',
  },
  en: {
    dir: 'ltr' as const,
    appTagline: 'Biometric identity verification — no app needed',
    onboardingTitle: 'Welcome to VeriKey',
    onboardingSubtitle: 'Set up your profile to send verification requests',
    labelName: 'Your name',
    placeholderName: 'e.g. David Cohen',
    labelMyPhone: 'Your phone number',
    labelMyEmail: 'Your email (optional)',
    placeholderEmail: 'you@example.com',
    saveProfile: 'Save & continue',
    profileTitle: 'My Profile',
    editProfile: 'Edit profile',
    saveBtn: 'Save',
    cancelBtn: 'Cancel',
    formTitle: 'Send a verification request',
    labelRecipientPhone: "Recipient's phone number",
    labelRecipientEmail: "Recipient's email",
    pickContact: 'Pick from contacts',
    pickNumber: 'Choose a number:',
    labelMessage: 'Message',
    defaultMessage: "Please verify your identity so I know it's really you.",
    emailSubject: 'Identity verification request',
    sendWhatsApp: 'Send via WhatsApp 💬',
    sendSMS: 'Send via SMS 📱',
    sendEmail: 'Send via Email 📧',
    emailSent: 'Email sent!',
    appOpened: (app: string) => `Open ${app} and send the message`,
    appOpenedNote: 'Once you send it, come back here — this page updates automatically.',
    waitingDesc: (recipient: string) => `Waiting for ${recipient} to verify…`,
    pollNote: 'This page updates automatically. Link is valid for 1 minute.',
    expired: 'Link Expired',
    expiredDesc: 'The recipient did not respond within 1 minute.',
    historyTitle: 'Verification History',
    historyEmpty: 'No history yet.',
    statusApproved: 'Approved ✅',
    statusDeclined: 'Declined ❌',
    statusExpired: 'Expired ⏰',
    statusPending: 'Pending…',
    verifyLinkLabel: 'Verification link:',
    sendAnother: 'Send another request',
    approved: 'Identity Verified!',
    approvedDesc: (recipient: string) => `${recipient} confirmed their identity with biometrics.`,
    declined: 'Declined',
    declinedDesc: 'The recipient declined the verification request.',
    tryAgain: 'Try again',
    errorName: 'Enter your name.',
    errorMyPhone: 'Enter a valid phone number.',
    errorRecipientPhone: "Enter the recipient's phone number.",
    errorRecipientEmail: "Enter a valid recipient email address.",
    errorMessage: 'Enter a message.',
    errorGeneric: 'Something went wrong.',
    errorNetwork: 'Network error. Please try again.',
    privacy: 'Phone numbers are sent over HTTPS and hashed server-side with a secret key — never stored in plain text.\nBiometric verification uses WebAuthn / Passkeys — no password needed.',
    passkeySetupTitle: 'Set up Biometric Verification',
    passkeySetupDesc: 'To approve future requests in one tap, set up a passkey. We\'ll send a setup link to your number.',
    passkeySetupBtn: 'Send setup link via WhatsApp',
    passkeySetupBtnSms: 'Send setup link via SMS',
    passkeySetupSent: 'Open WhatsApp and send the message — then tap the link you receive.',
    passkeySetupSentSms: 'Open SMS and send the message — then tap the link you receive.',
    passkeySetupWaiting: 'Waiting for setup to complete…',
    passkeyRegistered: 'Passkey registered ✓',
    passkeyRegisteredDesc: 'This device is set up for biometric verification.',
    passkeySuccess: 'Passkey set up successfully!',
    passkeyError: 'Setup failed. Please try again.',
    langLabel: 'עברית',
    defaultCountryCode: '+1',
    sending: 'Creating verification link…',
  },
} as const;

type Lang = keyof typeof T;
type Platform = 'whatsapp' | 'sms' | 'email';
type Step = 'form' | 'sending' | 'sent' | 'approved' | 'declined' | 'expired';

interface HistoryEntry {
  id: string;
  recipient: string;
  sentAt: string; // ISO
  status: 'approved' | 'declined' | 'expired';
}

const HISTORY_KEY = 'verikey_history';

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
}

function saveHistory(entry: HistoryEntry) {
  try {
    const prev = loadHistory();
    const next = [entry, ...prev].slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {}
}

interface Prefs {
  lang?: Lang;
  name?: string;
  phone?: string;
  email?: string;
  platform?: Platform;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function loadPrefs(): Prefs {
  try { return JSON.parse(localStorage.getItem('verikey_prefs') ?? '{}'); } catch { return {}; }
}

function savePrefs(patch: Partial<Prefs>) {
  try {
    localStorage.setItem('verikey_prefs', JSON.stringify({ ...loadPrefs(), ...patch }));
  } catch {}
}

function buildMsg(senderName: string, verifyUrl: string, lang: Lang): string {
  return lang === 'he'
    ? `${senderName} מבקש לאמת את זהותך. לחץ כאן: ${verifyUrl}`
    : `${senderName} is asking you to verify your identity. Tap here: ${verifyUrl}`;
}

function buildWaUrl(recipientPhone: string, senderName: string, verifyUrl: string, lang: Lang): string {
  return `https://wa.me/${normalizePhone(recipientPhone)}?text=${encodeURIComponent(buildMsg(senderName, verifyUrl, lang))}`;
}

function buildSmsUrl(recipientPhone: string, senderName: string, verifyUrl: string, lang: Lang): string {
  return `sms:${normalizePhone(recipientPhone)}?body=${encodeURIComponent(buildMsg(senderName, verifyUrl, lang))}`;
}

async function sendEmail(to: string, senderName: string, verifyUrl: string, lang: Lang, subject: string): Promise<boolean> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, senderName, verifyUrl, lang, subject }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const PLATFORM_LABELS: Record<Platform, string> = {
  whatsapp: 'WhatsApp 💬',
  sms: 'SMS 📱',
  email: 'Email 📧',
};

// ── Component ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [lang, setLang] = useState<Lang>('he');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  // Profile fields
  const [myName, setMyName] = useState('');
  const [myPhone, setMyPhone] = useState('');
  const [myEmail, setMyEmail] = useState('');
  // Edit-mode drafts
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftEmail, setDraftEmail] = useState('');

  // Send form
  const [step, setStep] = useState<Step>('form');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [platform, setPlatform] = useState<Platform>('whatsapp');
  const [error, setError] = useState('');
  const [verifyUrl, setVerifyUrl] = useState('');
  const [requestId, setRequestId] = useState('');
  // Display label for "sent" screen — phone or email depending on platform
  const [sentRecipient, setSentRecipient] = useState('');
  const [pwaInstallable, setPwaInstallable] = useState(false);
  const [contactsSupported, setContactsSupported] = useState(false);
  const [numberPickList, setNumberPickList] = useState<string[]>([]);
  const [emailPickList, setEmailPickList] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number>(0); // unix ms
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestIdRef = useRef('');
  const sentRecipientRef = useRef('');
  const expiresAtRef = useRef(0);

  // Passkey self-registration
  type PasskeyStatus = 'unknown' | 'checking' | 'unregistered' | 'registered' | 'success' | 'error';
  const [passkeyStatus, setPasskeyStatus] = useState<PasskeyStatus>('unknown');
  const [passkeyError, setPasskeyError] = useState('');
  type SetupLinkState = 'idle' | 'sending' | 'sent-wa' | 'sent-sms' | 'waiting' | 'done';
  const [setupLinkState, setSetupLinkState] = useState<SetupLinkState>('idle');
  const [setupRequestId, setSetupRequestId] = useState('');
  const [setupExpiresAt, setSetupExpiresAt] = useState(0);
  const setupPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load config & saved preferences ────────────────────────────────────
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(cfg => {
      const enabled = !!cfg.emailEnabled;
      setEmailEnabled(enabled);
      // If email was saved as preferred platform but is not available, fall back
      if (!enabled) {
        setPlatform(prev => prev === 'email' ? 'whatsapp' : prev);
      }
    }).catch(() => {});

    const p = loadPrefs();
    const activeLang: Lang = p.lang ?? 'he';
    setLang(activeLang);
    if (p.platform) setPlatform(p.platform);
    // Will be corrected to 'whatsapp' if email is disabled (handled after config loads)

    if (p.name && p.phone) {
      setMyName(p.name);
      setMyPhone(p.phone);
      setMyEmail(p.email ?? '');
      setHasProfile(true);
    } else {
      setMyPhone(T[activeLang].defaultCountryCode);
    }

    setMessage(T[activeLang].defaultMessage);
    setRecipientPhone(T[activeLang].defaultCountryCode);

    setHistory(loadHistory());
    setContactsSupported('contacts' in navigator && 'ContactsManager' in window);

    // Listen for PWA install availability (prompt was captured in layout script)
    if ((window as any).__pwaPrompt) setPwaInstallable(true);
    const onInstallable = () => setPwaInstallable(true);
    window.addEventListener('pwa-installable', onInstallable);
    return () => window.removeEventListener('pwa-installable', onInstallable);
  }, []);

  // Update prefix & default message when lang changes
  const prevLangRef = useRef<Lang | null>(null);
  useEffect(() => {
    if (prevLangRef.current === null) { prevLangRef.current = lang; return; }
    prevLangRef.current = lang;
    setMessage(T[lang].defaultMessage);
    setRecipientPhone(T[lang].defaultCountryCode);
    if (!hasProfile) setMyPhone(T[lang].defaultCountryCode);
  }, [lang]);

  // Keep refs in sync so the interval always reads current values
  useEffect(() => { requestIdRef.current = requestId; }, [requestId]);
  useEffect(() => { sentRecipientRef.current = sentRecipient; }, [sentRecipient]);
  useEffect(() => { expiresAtRef.current = expiresAt; }, [expiresAt]);

  // Polling for result — stops when approved, declined, or expired
  useEffect(() => {
    if (step !== 'sent') return;

    function finish(status: 'approved' | 'declined' | 'expired', nextStep: Step) {
      clearInterval(pollRef.current!);
      const entry: HistoryEntry = {
        id: requestIdRef.current,
        recipient: sentRecipientRef.current,
        sentAt: new Date().toISOString(),
        status,
      };
      saveHistory(entry);
      setHistory(loadHistory());
      setStep(nextStep);
    }

    pollRef.current = setInterval(async () => {
      // Check client-side expiry first (no network round-trip needed)
      if (expiresAtRef.current && Date.now() > expiresAtRef.current) {
        finish('expired', 'expired');
        return;
      }
      let statusValue: string | null = null;
      try {
        const res = await fetch(`/api/requests/${requestIdRef.current}/status`);
        if (!res.ok) return;
        const data = await res.json();
        statusValue = data.status;
      } catch {
        return;
      }
      if (statusValue === 'approved') finish('approved', 'approved');
      else if (statusValue === 'rejected' || statusValue === 'declined') finish('declined', 'declined');
      else if (statusValue === 'expired') finish('expired', 'expired');
    }, 2000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step]);

  const t = T[lang];

  function toggleLang() {
    const next: Lang = lang === 'he' ? 'en' : 'he';
    setLang(next);
    savePrefs({ lang: next });
  }

  function selectPlatform(p: Platform) {
    setPlatform(p);
    savePrefs({ platform: p });
  }

  // ── Onboarding save ────────────────────────────────────────────────────
  function handleSaveProfile() {
    if (!myName.trim()) { setError(t.errorName); return; }
    if (normalizePhone(myPhone).length < 7) { setError(t.errorMyPhone); return; }
    setError('');
    savePrefs({ name: myName.trim(), phone: myPhone, email: myEmail.trim() });
    setHasProfile(true);
    setRecipientPhone(T[lang].defaultCountryCode);
  }

  // ── Profile editor ────────────────────────────────────────────────────
  function openEditor() {
    setDraftName(myName);
    setDraftPhone(myPhone);
    setDraftEmail(myEmail);
    setShowProfileEditor(true);
  }

  function handleSaveEdit() {
    if (!draftName.trim()) return;
    if (normalizePhone(draftPhone).length < 7) return;
    setMyName(draftName.trim());
    setMyPhone(draftPhone);
    setMyEmail(draftEmail.trim());
    savePrefs({ name: draftName.trim(), phone: draftPhone, email: draftEmail.trim() });
    setShowProfileEditor(false);
  }

  // ── Contact picker ─────────────────────────────────────────────────────
  async function pickContact(field: 'phone' | 'email') {
    try {
      const props: string[] = field === 'phone' ? ['name', 'tel'] : ['name', 'email'];
      // @ts-ignore — ContactsManager not yet in TS lib
      const results = await navigator.contacts.select(props, { multiple: false });
      if (!results || results.length === 0) return;
      const contact = results[0];
      const values: string[] = field === 'phone' ? (contact.tel ?? []) : (contact.email ?? []);
      if (values.length === 0) return;
      if (values.length === 1) {
        if (field === 'phone') { setRecipientPhone(values[0]); setNumberPickList([]); }
        else { setRecipientEmail(values[0]); setEmailPickList([]); }
      } else {
        // Multiple numbers/emails — show inline picker
        if (field === 'phone') setNumberPickList(values);
        else setEmailPickList(values);
      }
    } catch {
      // User cancelled or permission denied — do nothing
    }
  }

  // ── Send ───────────────────────────────────────────────────────────────
  async function handleSend(forcePlatform?: Platform) {
    setError('');
    const usePlatform = forcePlatform ?? platform;
    const myPhoneNorm = normalizePhone(myPhone);

    // Validate recipient depending on platform
    if (usePlatform === 'email') {
      if (!isValidEmail(recipientEmail)) { setError(t.errorRecipientEmail); return; }
    } else {
      if (normalizePhone(recipientPhone).length < 7) { setError(t.errorRecipientPhone); return; }
    }
    if (!message.trim()) { setError(t.errorMessage); return; }

    setStep('sending');

    const recipientIdentifier = usePlatform === 'email'
      ? recipientEmail.trim().toLowerCase()
      : normalizePhone(recipientPhone);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_phone: myPhoneNorm,
          requester_name: myName.trim(),
          recipient_phone: recipientIdentifier,
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
      setExpiresAt(data.expires_at ? new Date(data.expires_at).getTime() : Date.now() + 60_000);

      let recipient: string;
      if (usePlatform === 'whatsapp') {
        window.open(buildWaUrl(recipientPhone, myName, data.verification_url, lang), '_blank');
        recipient = recipientPhone;
      } else if (usePlatform === 'sms') {
        window.open(buildSmsUrl(recipientPhone, myName, data.verification_url, lang), '_blank');
        recipient = recipientPhone;
      } else {
        const ok = await sendEmail(recipientEmail, myName, data.verification_url, lang, t.emailSubject);
        if (!ok) {
          setError(t.errorGeneric);
          setStep('form');
          return;
        }
        recipient = recipientEmail;
      }

      setSentRecipient(recipient);
      setStep('sent');
    } catch {
      setError(t.errorNetwork);
      setStep('form');
    }
  }

  // Check passkey status whenever profile phone changes
  useEffect(() => {
    if (!myPhone || normalizePhone(myPhone).length < 7) return;
    setPasskeyStatus('checking');
    fetch('/api/webauthn/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: normalizePhone(myPhone) }),
    })
      .then(r => r.json())
      .then(d => setPasskeyStatus(d.registered ? 'registered' : 'unregistered'))
      .catch(() => setPasskeyStatus('unknown'));
  }, [myPhone, hasProfile]);

  const handleSendSetupLink = useCallback(async (via: 'whatsapp' | 'sms') => {
    setSetupLinkState('sending');
    setPasskeyError('');
    try {
      const norm = normalizePhone(myPhone);
      const setupMsg = lang === 'he'
        ? `הגדר את VeriKey שלך — לחץ כאן:`
        : `Set up your VeriKey biometric — tap here:`;
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_phone: norm,
          requester_name: myName,
          recipient_phone: norm,
          message_text: setupMsg,
          purpose: 'self_register',
        }),
      });
      if (!res.ok) throw new Error('Failed to create setup link');
      const data = await res.json();
      const verifyUrl: string = data.verification_url;
      setSetupRequestId(data.id);
      setSetupExpiresAt(data.expires_at ? new Date(data.expires_at).getTime() : Date.now() + 300_000);

      const msgText = lang === 'he'
        ? `${setupMsg} ${verifyUrl}`
        : `${setupMsg} ${verifyUrl}`;

      if (via === 'whatsapp') {
        window.open(`https://wa.me/${norm}?text=${encodeURIComponent(msgText)}`, '_blank');
        setSetupLinkState('sent-wa');
      } else {
        window.open(`sms:${norm}?body=${encodeURIComponent(msgText)}`, '_blank');
        setSetupLinkState('sent-sms');
      }
    } catch (err: unknown) {
      setPasskeyError(err instanceof Error ? err.message : t.passkeyError);
      setPasskeyStatus('error');
      setSetupLinkState('idle');
    }
  }, [myPhone, myName, lang, t]);

  // Poll for setup completion
  useEffect(() => {
    if (setupLinkState !== 'sent-wa' && setupLinkState !== 'sent-sms' && setupLinkState !== 'waiting') return;
    setupPollRef.current = setInterval(async () => {
      if (setupExpiresAt && Date.now() > setupExpiresAt) {
        clearInterval(setupPollRef.current!);
        setSetupLinkState('idle');
        setPasskeyError(lang === 'he' ? 'פג תוקף. נסה שנית.' : 'Link expired. Please try again.');
        setPasskeyStatus('error');
        return;
      }
      try {
        const res = await fetch(`/api/requests/${setupRequestId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'approved') {
          clearInterval(setupPollRef.current!);
          setSetupLinkState('done');
          setPasskeyStatus('success');
        }
      } catch {}
    }, 2000);
    return () => { if (setupPollRef.current) clearInterval(setupPollRef.current); };
  }, [setupLinkState, setupRequestId, setupExpiresAt, lang]);

  function handleReset() {
    setStep('form');
    setVerifyUrl('');
    setRequestId('');
    setSentRecipient('');
    setExpiresAt(0);
    setError('');
    setRecipientPhone(T[lang].defaultCountryCode);
    setRecipientEmail('');
    setNumberPickList([]);
    setEmailPickList([]);
  }

  // ── Shared styles ──────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <main style={{
      minHeight: '100vh', background: '#f0f4ff',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: '2rem 1rem',
      fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>
      {/* Header */}
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
          <button
            onClick={async () => {
              const prompt = (window as any).__pwaPrompt;
              if (!prompt) return;
              await prompt.prompt();
              prompt.userChoice.then(() => { (window as any).__pwaPrompt = null; setPwaInstallable(false); });
            }}
            style={{ marginTop: '0.6rem', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            📲 {lang === 'he' ? 'התקן אפליקציה' : 'Install App'}
          </button>
        )}
      </div>

      {/* ── ONBOARDING ── */}
      {!hasProfile && (
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem' }}>👤</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.5rem 0 0.25rem', color: '#111' }}>{t.onboardingTitle}</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>{t.onboardingSubtitle}</p>
          </div>
          <div style={fieldGap}>
            <div>
              <label style={labelStyle}>{t.labelName}</label>
              <input style={inputStyle} placeholder={t.placeholderName} value={myName} onChange={e => setMyName(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>{t.labelMyPhone}</label>
              <input style={inputStyle} type="tel" value={myPhone} onChange={e => setMyPhone(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>{t.labelMyEmail}</label>
              <input style={inputStyle} type="email" placeholder={t.placeholderEmail} value={myEmail} onChange={e => setMyEmail(e.target.value)} />
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{error}</p>}
            <button style={btnPrimary} onClick={handleSaveProfile}>{t.saveProfile}</button>
          </div>
        </div>
      )}

      {/* ── PROFILE EDITOR modal ── */}
      {hasProfile && showProfileEditor && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '1rem',
        }}>
          <div style={{ ...card, maxWidth: 380, boxShadow: '0 8px 48px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1.25rem', color: '#111' }}>{t.profileTitle}</h2>
            <div style={fieldGap}>
              <div>
                <label style={labelStyle}>{t.labelName}</label>
                <input style={inputStyle} value={draftName} onChange={e => setDraftName(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{t.labelMyPhone}</label>
                <input style={inputStyle} type="tel" value={draftPhone} onChange={e => setDraftPhone(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{t.labelMyEmail}</label>
                <input style={inputStyle} type="email" placeholder={t.placeholderEmail} value={draftEmail} onChange={e => setDraftEmail(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button onClick={handleSaveEdit} style={{ ...btnPrimary, marginTop: 0, flex: 1 }}>{t.saveBtn}</button>
                <button onClick={() => setShowProfileEditor(false)} style={{
                  flex: 1, padding: '0.9rem', fontSize: '1rem', fontWeight: 600,
                  background: '#f3f4f6', color: '#374151', border: 'none',
                  borderRadius: '0.75rem', cursor: 'pointer',
                }}>{t.cancelBtn}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN SEND FORM ── */}
      {hasProfile && (
        <div style={card}>
          {/* Profile chip */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#f0f4ff', borderRadius: '0.75rem', padding: '0.6rem 0.9rem',
            marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>👤</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e3a8a' }}>{myName}</div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', direction: 'ltr' }}>
                  {myPhone}{myEmail ? ` · ${myEmail}` : ''}
                </div>
              </div>
            </div>
            <button onClick={openEditor} style={{
              background: 'none', border: '1.5px solid #c7d2fe', borderRadius: '0.5rem',
              padding: '0.3rem 0.65rem', fontSize: '0.78rem', fontWeight: 600,
              color: '#4338ca', cursor: 'pointer',
            }}>✏️ {t.editProfile}</button>
          </div>

          {/* ── Passkey setup panel ── */}
          {step === 'form' && passkeyStatus === 'unregistered' && setupLinkState === 'idle' && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '0.85rem', padding: '1rem 1.1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e40af', marginBottom: '0.25rem' }}>🔑 {t.passkeySetupTitle}</div>
              <p style={{ color: '#374151', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>{t.passkeySetupDesc}</p>
              <button onClick={() => handleSendSetupLink('whatsapp')} style={{ ...btnPrimary, marginTop: 0, fontSize: '0.88rem', padding: '0.65rem', background: '#25D366', marginBottom: '0.4rem' }}>
                {t.passkeySetupBtn}
              </button>
              <button onClick={() => handleSendSetupLink('sms')} style={{ ...btnPrimary, marginTop: 0, fontSize: '0.88rem', padding: '0.65rem', background: '#6b7280' }}>
                {t.passkeySetupBtnSms}
              </button>
            </div>
          )}

          {step === 'form' && passkeyStatus === 'unregistered' && setupLinkState === 'sending' && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '0.85rem', padding: '0.85rem 1.1rem', marginBottom: '1.25rem', textAlign: 'center', color: '#1e40af', fontSize: '0.88rem' }}>
              ⏳ {lang === 'he' ? 'יוצר קישור…' : 'Creating link…'}
            </div>
          )}

          {step === 'form' && passkeyStatus === 'unregistered' && (setupLinkState === 'sent-wa' || setupLinkState === 'sent-sms' || setupLinkState === 'waiting') && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '0.85rem', padding: '1rem 1.1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e40af', marginBottom: '0.4rem' }}>📲 {setupLinkState === 'sent-wa' ? t.passkeySetupSent : t.passkeySetupSentSms}</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>⏳ {t.passkeySetupWaiting}</div>
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
              <button onClick={() => { setPasskeyStatus('unregistered'); setSetupLinkState('idle'); setPasskeyError(''); }}
                style={{ background: 'none', border: '1.5px solid #fca5a5', borderRadius: '0.5rem', padding: '0.3rem 0.65rem', fontSize: '0.78rem', fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}>
                {lang === 'he' ? 'נסה שנית' : 'Try again'}
              </button>
            </div>
          )}

          {step === 'form' && (
            <>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#111', marginTop: 0 }}>{t.formTitle}</h2>

              {/* Platform toggle */}
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                {(['whatsapp', 'sms', ...(emailEnabled ? ['email' as Platform] : [])] as Platform[]).map((p) => (
                  <button key={p} onClick={() => selectPlatform(p)} style={{
                    flex: 1, padding: '0.45rem 0.25rem', borderRadius: '0.6rem',
                    border: `2px solid ${platform === p ? '#2563eb' : '#e5e7eb'}`,
                    background: platform === p ? '#eff6ff' : '#f9fafb',
                    color: platform === p ? '#2563eb' : '#6b7280',
                    fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
                  }}>
                    {PLATFORM_LABELS[p]}
                  </button>
                ))}
              </div>

              <div style={fieldGap}>
                {/* Recipient field — phone or email depending on platform */}
                {platform === 'email' ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <label style={{ ...labelStyle, margin: 0 }}>{t.labelRecipientEmail}</label>
                      {contactsSupported && (
                        <button type="button" onClick={() => pickContact('email')}
                          style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                          📋 {t.pickContact}
                        </button>
                      )}
                    </div>
                    <input style={inputStyle} type="email" placeholder={t.placeholderEmail}
                      value={recipientEmail} onChange={e => { setRecipientEmail(e.target.value); setEmailPickList([]); }} />
                    {emailPickList.length > 1 && (
                      <div style={{ marginTop: '0.4rem', background: '#f0f4ff', borderRadius: '0.5rem', padding: '0.5rem 0.75rem' }}>
                        <p style={{ fontSize: '0.78rem', color: '#4338ca', fontWeight: 600, margin: '0 0 0.35rem' }}>{t.pickNumber}</p>
                        {emailPickList.map(v => (
                          <button key={v} type="button" onClick={() => { setRecipientEmail(v); setEmailPickList([]); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.25rem 0', fontSize: '0.875rem', color: '#1e3a8a', cursor: 'pointer', direction: 'ltr' }}>
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <label style={{ ...labelStyle, margin: 0 }}>{t.labelRecipientPhone}</label>
                      {contactsSupported && (
                        <button type="button" onClick={() => pickContact('phone')}
                          style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                          📋 {t.pickContact}
                        </button>
                      )}
                    </div>
                    <input style={inputStyle} type="tel" value={recipientPhone}
                      onChange={e => { setRecipientPhone(e.target.value); setNumberPickList([]); }} />
                    {numberPickList.length > 1 && (
                      <div style={{ marginTop: '0.4rem', background: '#f0f4ff', borderRadius: '0.5rem', padding: '0.5rem 0.75rem' }}>
                        <p style={{ fontSize: '0.78rem', color: '#4338ca', fontWeight: 600, margin: '0 0 0.35rem' }}>{t.pickNumber}</p>
                        {numberPickList.map(v => (
                          <button key={v} type="button" onClick={() => { setRecipientPhone(v); setNumberPickList([]); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '0.25rem 0', fontSize: '0.875rem', color: '#1e3a8a', cursor: 'pointer', direction: 'ltr' }}>
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label style={labelStyle}>{t.labelMessage}</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 } as React.CSSProperties}
                    value={message} onChange={e => setMessage(e.target.value)} />
                </div>

                {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{error}</p>}

                {/* Primary send button */}
                <button style={btnPrimary} onClick={() => handleSend()}>
                  {platform === 'whatsapp' ? t.sendWhatsApp : platform === 'sms' ? t.sendSMS : t.sendEmail}
                </button>

                {/* Secondary alternatives — only phone-based alternates when not on email */}
                {platform !== 'email' && (
                  <button onClick={() => handleSend(platform === 'whatsapp' ? 'sms' : 'whatsapp')}
                    style={{ ...btnPrimary, background: 'transparent', color: '#6b7280', fontSize: '0.85rem', border: '1.5px solid #e5e7eb', marginTop: 0 }}>
                    {platform === 'whatsapp' ? t.sendSMS : t.sendWhatsApp}
                  </button>
                )}
              </div>
            </>
          )}

          {step === 'sending' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
              <p style={{ color: '#6b7280' }}>{t.sending}</p>
            </div>
          )}

          {step === 'sent' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '2.5rem' }}>{platform === 'email' ? '✅' : '📤'}</div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>
                  {platform === 'email' ? t.emailSent : t.appOpened(platform === 'whatsapp' ? 'WhatsApp' : 'SMS')}
                </h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  {platform === 'email' ? t.waitingDesc(sentRecipient) : t.appOpenedNote}
                </p>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: '0.75rem', padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#374151', wordBreak: 'break-all', direction: 'ltr', textAlign: 'left' }}>
                <strong>{t.verifyLinkLabel}</strong><br />
                <a href={verifyUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{verifyUrl}</a>
              </div>
              {/* Resend / open via other channels */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['whatsapp', 'sms', ...(emailEnabled ? ['email' as Platform] : [])] as Platform[]).filter(p => p !== platform).map(p => (
                  <button key={p} onClick={() => {
                    if (p === 'email') {
                      if (!recipientEmail) return;
                      sendEmail(recipientEmail, myName, verifyUrl, lang, t.emailSubject);
                    } else if (p === 'whatsapp') {
                      window.open(buildWaUrl(recipientPhone, myName, verifyUrl, lang), '_blank');
                    } else {
                      window.open(buildSmsUrl(recipientPhone, myName, verifyUrl, lang), '_blank');
                    }
                  }} style={{
                    flex: 1, padding: '0.6rem 0.25rem', background: '#f0f4ff',
                    border: '1.5px solid #c7d2fe', borderRadius: '0.6rem',
                    fontSize: '0.78rem', fontWeight: 600, color: '#4338ca', cursor: 'pointer',
                  }}>
                    {PLATFORM_LABELS[p]}
                  </button>
                ))}
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

          {step === 'approved' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', marginBottom: '0.5rem' }}>{t.approved}</h2>
              <p style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{t.approvedDesc(sentRecipient)}</p>
              <button style={btnPrimary} onClick={handleReset}>{t.sendAnother}</button>
            </div>
          )}

          {step === 'declined' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>❌</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#dc2626', marginBottom: '0.5rem' }}>{t.declined}</h2>
              <p style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{t.declinedDesc}</p>
              <button style={btnPrimary} onClick={handleReset}>{t.tryAgain}</button>
            </div>
          )}

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

      {/* ── Request History ─────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div style={{ width: '100%', maxWidth: 420, marginTop: '1.25rem' }}>
          <button
            onClick={() => setShowHistory(h => !h)}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: t.dir === 'rtl' ? 'right' : 'left', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600, padding: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
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

      <p style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center', maxWidth: 380, direction: t.dir, whiteSpace: 'pre-line' }}>
        {t.privacy}
      </p>
    </main>
  );
}
