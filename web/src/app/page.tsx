'use client';

// React hooks used throughout the component:
// - useState: reactive UI state (form fields, steps, passkey status, etc.)
// - useEffect: side effects (data fetching, polling, localStorage sync)
// - useRef: mutable values that persist across renders without causing re-renders
//           (interval handles, current requestId/recipient for stale-closure safety)
// - useCallback: memoises a function so it isn't re-created on every render
import { useState, useEffect, useRef, useCallback } from 'react';

// ── Translations ─────────────────────────────────────────────────────────────
// All user-visible strings are stored here, keyed by language ('he' / 'en').
// `dir` controls HTML text direction (RTL for Hebrew, LTR for English).
// Functions like `appOpened` and `waitingDesc` are string builders that
// interpolate runtime values into translated copy.
const T = {
  he: {
    dir: 'rtl' as const,
    appTagline: 'אימות ביומטרי אישי',
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
    sendBlockedTitle: 'יש להגדיר אימות ביומטרי תחילה',
    sendBlockedDesc: 'לפני שליחת בקשת אימות לאחרים, עליך להגדיר את מפתח הגישה האישי שלך.',
    errorPhoneExists: 'מספר זה כבר רשום במערכת. פתח את VeriKey במכשיר שבו הגדרת את האימות הביומטרי.',
    sending: 'יוצר קישור אימות…',
  },
  en: {
    dir: 'ltr' as const,
    appTagline: 'Personal biometric authentication',
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
    sendBlockedTitle: 'Set up your passkey first',
    sendBlockedDesc: 'Before sending a verification request to others, you need to set up your own passkey.',
    errorPhoneExists: 'This number is already registered. Open VeriKey on the device where you set up biometric verification.',
    sending: 'Creating verification link…',
  },
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────
// Lang: the two supported UI languages.
type Lang = keyof typeof T;

// Platform: the channel used to deliver the verification link to the recipient.
// 'whatsapp' and 'sms' open a pre-filled native app; 'email' calls /api/send-email.
type Platform = 'whatsapp' | 'sms' | 'email';

// Step: the main flow state machine for the send-request journey:
//   form     → user is filling in the send form
//   sending  → API call in progress (spinner shown)
//   sent     → link delivered, polling for recipient response
//   approved → recipient authenticated with biometrics
//   declined → recipient pressed "Decline"
//   expired  → 1-minute timer elapsed with no response
type Step = 'form' | 'sending' | 'sent' | 'approved' | 'declined' | 'expired';

// HistoryEntry: one completed verification request stored in localStorage.
// Keeps only the last 10 entries (trimmed in saveHistory).
interface HistoryEntry {
  id: string;        // server-assigned UUID for the request
  recipient: string; // phone number or email shown to the sender
  sentAt: string;    // ISO timestamp when the request was created
  status: 'approved' | 'declined' | 'expired';
}

// localStorage key for the history array.
const HISTORY_KEY = 'verikey_history';

// loadHistory: reads and parses the history array from localStorage.
// Returns an empty array if the key is missing or the JSON is malformed.
function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
}

// saveHistory: prepends a new entry to the stored history and keeps at most 10.
// Wrapped in try/catch so a full storage quota never breaks the UI flow.
function saveHistory(entry: HistoryEntry) {
  try {
    const prev = loadHistory();
    const next = [entry, ...prev].slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {}
}

// Prefs: user preferences persisted in localStorage under 'verikey_prefs'.
// Loaded once on mount and written whenever the user changes a setting.
interface Prefs {
  lang?: Lang;
  name?: string;
  phone?: string;
  email?: string;
  platform?: Platform;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// normalizePhone: strips all non-digit characters from a phone string.
// Used before sending to APIs and when building WhatsApp / SMS deep-links
// (those URLs require digits only).
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

// isValidEmail: basic format check — at least one non-whitespace/@ character
// on each side of the @ and a dot in the domain part.
function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// loadPrefs / savePrefs: thin wrappers around localStorage for user preferences.
// savePrefs merges a partial patch into the existing object (non-destructive).
function loadPrefs(): Prefs {
  try { return JSON.parse(localStorage.getItem('verikey_prefs') ?? '{}'); } catch { return {}; }
}

function savePrefs(patch: Partial<Prefs>) {
  try {
    localStorage.setItem('verikey_prefs', JSON.stringify({ ...loadPrefs(), ...patch }));
  } catch {}
}

// buildMsg: produces the human-readable message body sent to the recipient
// via WhatsApp or SMS. It includes the sender's name and the unique verify URL.
function buildMsg(senderName: string, verifyUrl: string, lang: Lang): string {
  return lang === 'he'
    ? `${senderName} מבקש לאמת את זהותך. לחץ כאן: ${verifyUrl}`
    : `${senderName} is asking you to verify your identity. Tap here: ${verifyUrl}`;
}

// buildWaUrl: constructs a wa.me deep-link that opens WhatsApp with the
// recipient's number pre-filled and the verify message in the text field.
function buildWaUrl(recipientPhone: string, senderName: string, verifyUrl: string, lang: Lang): string {
  return `https://wa.me/${normalizePhone(recipientPhone)}?text=${encodeURIComponent(buildMsg(senderName, verifyUrl, lang))}`;
}

// buildSmsUrl: constructs an sms: URI with the message body pre-filled.
// Behaviour (auto-open vs. compose screen) varies by OS and carrier app.
function buildSmsUrl(recipientPhone: string, senderName: string, verifyUrl: string, lang: Lang): string {
  return `sms:${normalizePhone(recipientPhone)}?body=${encodeURIComponent(buildMsg(senderName, verifyUrl, lang))}`;
}

// sendEmail: posts to our internal /api/send-email route which relays the
// message via a configured email provider (e.g. Resend / SendGrid).
// Returns true on HTTP 2xx, false on any error.
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

// PLATFORM_LABELS: display labels for the platform toggle buttons.
const PLATFORM_LABELS: Record<Platform, string> = {
  whatsapp: 'WhatsApp 💬',
  sms: 'SMS 📱',
  email: 'Email 📧',
};

// ── Component ─────────────────────────────────────────────────────────────────
// HomePage is the single-page application root.
// It owns the entire UI state — profile, send form, polling, passkey setup,
// and history — and renders different sections based on that state.
export default function HomePage() {
  // ── Language & feature flags ──────────────────────────────────────────────
  // lang: currently selected UI language; persisted in prefs.
  const [lang, setLang] = useState<Lang>('he');
  // emailEnabled: loaded from /api/config; controls whether the Email platform
  // option is shown. False by default until the config fetch resolves.
  const [emailEnabled, setEmailEnabled] = useState(false);

  // ── Profile state ─────────────────────────────────────────────────────────
  // hasProfile: true once the user has saved name + phone for the first time.
  // When false the onboarding form is shown instead of the send form.
  const [hasProfile, setHasProfile] = useState(false);
  // showProfileEditor: controls visibility of the edit-profile modal overlay.
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  // Live profile values (committed / saved):
  const [myName, setMyName] = useState('');
  const [myPhone, setMyPhone] = useState('');
  const [myEmail, setMyEmail] = useState('');

  // Draft values used only while the edit modal is open; discarded on cancel.
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftEmail, setDraftEmail] = useState('');

  // ── Send form state ───────────────────────────────────────────────────────
  // step: drives which UI panel is visible (form, sending spinner, waiting,
  // or one of the three outcome screens).
  const [step, setStep] = useState<Step>('form');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  // platform: whatsapp | sms | email — how the link is delivered.
  const [platform, setPlatform] = useState<Platform>('whatsapp');
  const [error, setError] = useState('');
  // verifyUrl: the unique one-time URL returned by /api/requests, shown on
  // the "sent" screen so the sender can manually re-share if needed.
  const [verifyUrl, setVerifyUrl] = useState('');
  // requestId: the server UUID for the pending request, used to poll /api/requests/:id/status.
  const [requestId, setRequestId] = useState('');
  // sentRecipient: display label (phone or email) shown while waiting and in
  // the outcome screens; set from whichever field was used.
  const [sentRecipient, setSentRecipient] = useState('');

  // ── PWA / contacts ────────────────────────────────────────────────────────
  // pwaInstallable: true when the browser has fired the beforeinstallprompt
  // event (captured in layout.tsx); shows the "Install App" button.
  const [pwaInstallable, setPwaInstallable] = useState(false);
  // contactsSupported: true on Android Chrome with the Contacts API available;
  // shows the "Pick from contacts" shortcut next to phone/email fields.
  const [contactsSupported, setContactsSupported] = useState(false);
  // numberPickList / emailPickList: when the user picks a contact that has
  // multiple numbers/emails, this list is shown as an inline chooser.
  const [numberPickList, setNumberPickList] = useState<string[]>([]);
  const [emailPickList, setEmailPickList] = useState<string[]>([]);

  // ── History ───────────────────────────────────────────────────────────────
  // history: in-memory mirror of the localStorage history array, kept in sync
  // after every completed request so the list updates without a page reload.
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // showHistory: toggles the collapsible history section.
  const [showHistory, setShowHistory] = useState(false);

  // ── Polling ───────────────────────────────────────────────────────────────
  // expiresAt: Unix ms timestamp when the current verification link expires;
  // checked client-side every poll tick to avoid an unnecessary network call.
  const [expiresAt, setExpiresAt] = useState<number>(0);
  // pollRef: holds the setInterval handle so it can be cleared from inside
  // the interval callback or on effect cleanup (whichever fires first).
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs that mirror the corresponding state values for use inside the polling
  // interval callback. setInterval captures variables by closure at creation
  // time; these refs are always current regardless of when the interval fires.
  const requestIdRef = useRef('');
  const sentRecipientRef = useRef('');
  const expiresAtRef = useRef(0);

  // ── Passkey self-registration ─────────────────────────────────────────────
  // PasskeyStatus represents whether the current user's phone number already
  // has a registered passkey credential in the database:
  //   unknown     → initial state before any check
  //   checking    → /api/webauthn/status fetch in flight
  //   unregistered → no credential found; setup panel is shown
  //   registered  → credential exists; green chip shown, no re-register allowed
  //   success     → credential was just registered in this session
  //   error       → setup attempt failed
  type PasskeyStatus = 'unknown' | 'checking' | 'unregistered' | 'registered' | 'success' | 'error';
  const [passkeyStatus, setPasskeyStatus] = useState<PasskeyStatus>('unknown');
  const [passkeyError, setPasskeyError] = useState('');

  // SetupLinkState drives the passkey self-registration sub-flow:
  //   idle     → setup panel with WhatsApp / SMS buttons shown
  //   sending  → /api/requests call in flight
  //   sent-wa  → WhatsApp opened; polling for the user to click the link
  //   sent-sms → SMS app opened; polling for the user to click the link
  //   waiting  → user indicated they're waiting (same poll as sent-*)
  //   done     → setup confirmed (passkey approved); switches to 'success'
  type SetupLinkState = 'idle' | 'sending' | 'sent-wa' | 'sent-sms' | 'waiting' | 'done';
  const [setupLinkState, setSetupLinkState] = useState<SetupLinkState>('idle');
  // setupRequestId: the server UUID for the self-registration request;
  // used to poll for approval (same mechanism as normal verification requests).
  const [setupRequestId, setSetupRequestId] = useState('');
  // setupExpiresAt: Unix ms expiry for the self-registration link (5 minutes).
  const [setupExpiresAt, setSetupExpiresAt] = useState(0);
  // setupPollRef: interval handle for the passkey setup polling loop.
  const setupPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Effect: initial load ──────────────────────────────────────────────────
  // Runs once on mount. Fetches server config, restores saved prefs from
  // localStorage, and registers PWA install event listeners.
  useEffect(() => {
    // Fetch /api/config to determine whether email sending is configured.
    fetch('/api/config').then(r => r.json()).then(cfg => {
      const enabled = !!cfg.emailEnabled;
      setEmailEnabled(enabled);
      // If the user previously chose email but it's not available, fall back to WhatsApp.
      if (!enabled) {
        setPlatform(prev => prev === 'email' ? 'whatsapp' : prev);
      }
    }).catch(() => {});

    // Restore all saved preferences from localStorage.
    const p = loadPrefs();
    const activeLang: Lang = p.lang ?? 'he';
    setLang(activeLang);
    if (p.platform) setPlatform(p.platform);

    if (p.name && p.phone) {
      // Returning user: populate profile fields and skip onboarding.
      setMyName(p.name);
      setMyPhone(p.phone);
      setMyEmail(p.email ?? '');
      setHasProfile(true);
    } else {
      // First-time user: pre-fill phone prefix based on language default.
      setMyPhone(T[activeLang].defaultCountryCode);
    }

    // Set the default message and recipient prefix for the send form.
    setMessage(T[activeLang].defaultMessage);
    setRecipientPhone(T[activeLang].defaultCountryCode);

    // Load any previously saved verification history into state.
    setHistory(loadHistory());

    // Detect Contacts API support (Android Chrome only).
    setContactsSupported('contacts' in navigator && 'ContactsManager' in window);

    // Show the PWA install button if the install prompt was captured earlier
    // (the beforeinstallprompt handler in layout.tsx stores it on window.__pwaPrompt).
    if ((window as any).__pwaPrompt) setPwaInstallable(true);
    const onInstallable = () => setPwaInstallable(true);
    window.addEventListener('pwa-installable', onInstallable);
    return () => window.removeEventListener('pwa-installable', onInstallable);
  }, []);

  // ── Effect: language change ───────────────────────────────────────────────
  // When the user switches language, reset the default message text and
  // phone prefixes to match the new locale. Skips the very first render
  // (prevLangRef starts null) to avoid overwriting restored prefs.
  const prevLangRef = useRef<Lang | null>(null);
  useEffect(() => {
    if (prevLangRef.current === null) { prevLangRef.current = lang; return; }
    prevLangRef.current = lang;
    setMessage(T[lang].defaultMessage);
    setRecipientPhone(T[lang].defaultCountryCode);
    if (!hasProfile) setMyPhone(T[lang].defaultCountryCode);
  }, [lang]);

  // ── Effects: keep refs in sync with state ─────────────────────────────────
  // The polling interval callback captures variables by closure when the
  // interval is created. These refs are updated synchronously after every
  // render so the interval always reads the latest values regardless of
  // when it was originally created.
  useEffect(() => { requestIdRef.current = requestId; }, [requestId]);
  useEffect(() => { sentRecipientRef.current = sentRecipient; }, [sentRecipient]);
  useEffect(() => { expiresAtRef.current = expiresAt; }, [expiresAt]);

  // ── Effect: poll for verification result ──────────────────────────────────
  // Active only while step === 'sent'. Every 2 seconds it either:
  //   a) checks client-side expiry (no network call) and transitions to 'expired', or
  //   b) fetches /api/requests/:id/status and transitions to the matching step.
  // finish() is called AFTER the try/catch so any error inside it is not
  // silently swallowed. saveHistory is itself wrapped in try/catch so a full
  // localStorage quota never prevents the step transition.
  useEffect(() => {
    if (step !== 'sent') return;

    // finish: clears the interval, writes the history entry, and advances the step.
    // Reads from refs (not closure variables) to guarantee current values.
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
      // Fast path: check client-side expiry timestamp to avoid a round-trip.
      if (expiresAtRef.current && Date.now() > expiresAtRef.current) {
        finish('expired', 'expired');
        return;
      }

      // Fetch the current status from the server.
      // statusValue is extracted here so that finish() is called OUTSIDE the
      // try/catch — errors inside finish() will propagate normally rather than
      // being swallowed by catch {}.
      let statusValue: string | null = null;
      try {
        const res = await fetch(`/api/requests/${requestIdRef.current}/status`);
        if (!res.ok) return;
        const data = await res.json();
        statusValue = data.status;
      } catch {
        return; // network failure — will retry on next tick
      }

      if (statusValue === 'approved') finish('approved', 'approved');
      else if (statusValue === 'rejected' || statusValue === 'declined') finish('declined', 'declined');
      else if (statusValue === 'expired') finish('expired', 'expired');
      // 'pending' → do nothing; wait for the next tick
    }, 2000);

    // Cleanup: clear the interval when the effect is torn down (step changes
    // away from 'sent', or the component unmounts).
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step]); // only [step] — current values are read via refs, not closure

  // ── Computed shorthand ────────────────────────────────────────────────────
  // t: the translation object for the active language; used throughout JSX.
  const t = T[lang];

  // ── toggleLang ────────────────────────────────────────────────────────────
  // Switches between Hebrew and English, persisting the choice to prefs.
  function toggleLang() {
    const next: Lang = lang === 'he' ? 'en' : 'he';
    setLang(next);
    savePrefs({ lang: next });
  }

  // ── selectPlatform ────────────────────────────────────────────────────────
  // Updates the active delivery platform and saves it to prefs so the choice
  // is remembered on the next visit.
  function selectPlatform(p: Platform) {
    setPlatform(p);
    savePrefs({ platform: p });
  }

  // ── handleSaveProfile ─────────────────────────────────────────────────────
  // Validates the onboarding form (name + phone required), saves prefs, and
  // transitions out of the onboarding screen into the main send form.
  async function handleSaveProfile() {
    if (!myName.trim()) { setError(t.errorName); return; }
    if (normalizePhone(myPhone).length < 7) { setError(t.errorMyPhone); return; }
    setError('');
    // Check whether this phone number already has a registered passkey.
    // If so, the account belongs to someone else's device and we must not
    // let a new local profile claim it.
    try {
      const res = await fetch('/api/webauthn/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: normalizePhone(myPhone) }),
      });
      if (res.ok) {
        const { registered } = await res.json();
        if (registered) {
          setError(t.errorPhoneExists);
          return;
        }
      }
    } catch {
      // Network failure — allow proceeding; the server will enforce constraints
    }
    savePrefs({ name: myName.trim(), phone: myPhone, email: myEmail.trim() });
    setHasProfile(true);
    setRecipientPhone(T[lang].defaultCountryCode);
  }

  // ── openEditor ────────────────────────────────────────────────────────────
  // Copies the current saved profile values into the draft fields and opens
  // the edit modal. Draft changes don't affect live state until saved.
  function openEditor() {
    setDraftName(myName);
    setDraftPhone(myPhone);
    setDraftEmail(myEmail);
    setShowProfileEditor(true);
  }

  // ── handleSaveEdit ────────────────────────────────────────────────────────
  // Validates the draft fields, commits them to live state + prefs, and closes
  // the edit modal. If validation fails, the modal stays open (no error message
  // shown here — the fields simply don't save).
  function handleSaveEdit() {
    if (!draftName.trim()) return;
    if (normalizePhone(draftPhone).length < 7) return;
    setMyName(draftName.trim());
    setMyPhone(draftPhone);
    setMyEmail(draftEmail.trim());
    savePrefs({ name: draftName.trim(), phone: draftPhone, email: draftEmail.trim() });
    setShowProfileEditor(false);
  }

  // ── pickContact ───────────────────────────────────────────────────────────
  // Opens the native Contacts picker (Android Chrome only) and populates either
  // the recipient phone or email field. If the contact has multiple values, an
  // inline chooser list is shown instead of auto-filling.
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
        // Single value — fill the field directly.
        if (field === 'phone') { setRecipientPhone(values[0]); setNumberPickList([]); }
        else { setRecipientEmail(values[0]); setEmailPickList([]); }
      } else {
        // Multiple values — show an inline picker so the user can choose.
        if (field === 'phone') setNumberPickList(values);
        else setEmailPickList(values);
      }
    } catch {
      // User cancelled the picker or permission was denied — do nothing.
    }
  }

  // ── handleSend ────────────────────────────────────────────────────────────
  // Core send flow:
  //   1. Validates the recipient field and message.
  //   2. Calls POST /api/requests to create a verification request in the DB
  //      and receive a unique one-time token/URL.
  //   3. Opens the correct messaging app (WhatsApp / SMS) or calls sendEmail.
  //   4. Advances step to 'sent' so the polling effect activates.
  //
  // forcePlatform: optionally overrides the selected platform (used by the
  // secondary "send via other channel" buttons on the sent screen).
  async function handleSend(forcePlatform?: Platform) {
    setError('');
    const usePlatform = forcePlatform ?? platform;
    const myPhoneNorm = normalizePhone(myPhone);

    // Validate recipient depending on platform.
    if (usePlatform === 'email') {
      if (!isValidEmail(recipientEmail)) { setError(t.errorRecipientEmail); return; }
    } else {
      if (normalizePhone(recipientPhone).length < 7) { setError(t.errorRecipientPhone); return; }
    }
    if (!message.trim()) { setError(t.errorMessage); return; }

    setStep('sending');

    // recipientIdentifier is what gets stored server-side as the intended
    // recipient (used for binding checks on the verify page).
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
      // Store the URL, request ID, and expiry — all needed by the polling effect.
      setVerifyUrl(data.verification_url);
      setRequestId(data.id);
      setExpiresAt(data.expires_at ? new Date(data.expires_at).getTime() : Date.now() + 60_000);

      // Open the appropriate messaging channel and record the display label.
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

      // sentRecipient is shown on the waiting screen and stored in history.
      setSentRecipient(recipient);
      // Advancing to 'sent' activates the polling useEffect above.
      setStep('sent');
    } catch {
      setError(t.errorNetwork);
      setStep('form');
    }
  }

  // ── Effect: check passkey registration status ─────────────────────────────
  // Fires whenever the user's phone changes or the profile is first saved.
  // Calls POST /api/webauthn/status to determine whether a passkey credential
  // already exists for this phone number in the DB, then sets passkeyStatus
  // accordingly to show or hide the setup panel.
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

  // ── handleSendSetupLink ───────────────────────────────────────────────────
  // Initiates the passkey self-registration flow:
  //   1. Creates a verification request where requester === recipient (same phone).
  //      The server marks it with purpose='self_register' (5-minute expiry).
  //   2. Opens WhatsApp or SMS with the setup link pre-filled.
  //   3. Sets setupLinkState to 'sent-wa' or 'sent-sms' to activate the setup
  //      polling effect below.
  //
  // The user must receive and tap the link on their device to prove they own
  // the phone number — no OTP required.
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
          recipient_phone: norm,      // same as requester — self-registration
          message_text: setupMsg,
          purpose: 'self_register',   // server uses this to set 5-min expiry
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

      // Open the messaging app with the setup link.
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

  // ── Effect: poll for passkey setup completion ─────────────────────────────
  // Runs while setupLinkState is 'sent-wa', 'sent-sms', or 'waiting'.
  // Every 2 seconds it checks whether the self-registration request was approved
  // (i.e., the user tapped the link and completed the biometric registration).
  // On approval it transitions passkeyStatus to 'success' and stops polling.
  // On expiry it resets back to idle with an error message.
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

  // ── handleReset ───────────────────────────────────────────────────────────
  // Returns the UI to the empty send form after a completed (or cancelled)
  // verification request. Clears all per-request state while leaving the
  // profile and history untouched.
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

  // ── Shared styles ─────────────────────────────────────────────────────────
  // Inline style objects reused across multiple elements.
  // Kept here (not in CSS) so the whole component is self-contained with no
  // external stylesheet dependency.

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

  // card: the white rounded panel that wraps each major section.
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

  // fieldGap: vertical flex container that spaces form fields evenly.
  const fieldGap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.85rem' };

  // ── Render ────────────────────────────────────────────────────────────────
  // The component renders three high-level sections:
  //   1. Header — logo, tagline, privacy text, PWA install button, lang toggle
  //   2. Main card — conditionally shows onboarding, profile editor modal,
  //      or the send form (with passkey panel + step-specific content)
  //   3. History — collapsible list of past requests below the card
  //   4. Footer — repeated privacy note
  return (
    <main style={{
      minHeight: '100vh', background: '#f0f4ff',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: '2rem 1rem',
      fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>

      {/* ── Header ── */}
      {/* Contains the app logo, tagline, privacy summary, lang toggle, and optional PWA install button. */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center', width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Lang toggle button — floated to the trailing edge for the active direction */}
        <button onClick={toggleLang} style={{
          position: 'absolute', top: 0,
          [t.dir === 'rtl' ? 'left' : 'right']: 0,
          background: '#e0e7ff', border: 'none', borderRadius: '0.5rem',
          padding: '0.3rem 0.7rem', fontSize: '0.82rem', fontWeight: 700,
          cursor: 'pointer', color: '#3730a3',
        }}>{t.langLabel}</button>

        <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🔐</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a8a', margin: 0 }}>VeriKey</h1>

        {/* Tagline */}
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem', direction: t.dir }}>
          {t.appTagline}
        </p>

        {/* PWA install button — only visible when the browser exposes an install prompt */}
        {pwaInstallable && (
          <button
            onClick={async () => {
              const prompt = (window as any).__pwaPrompt;
              if (!prompt) return;
              await prompt.prompt();
              // Discard the prompt after one use (browsers only allow it once).
              prompt.userChoice.then(() => { (window as any).__pwaPrompt = null; setPwaInstallable(false); });
            }}
            style={{ marginTop: '0.6rem', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            📲 {lang === 'he' ? 'התקן אפליקציה' : 'Install App'}
          </button>
        )}
      </div>

      {/* ── ONBOARDING ── */}
      {/* Shown on first visit (hasProfile === false). Collects name, phone, and
          optional email. On save, persists to localStorage and reveals the send form. */}
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

      {/* ── PROFILE EDITOR MODAL ── */}
      {/* Full-screen overlay that lets the user update their saved profile.
          Changes are staged in draft* state and only committed on "Save". */}
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

      {/* ── MAIN SEND CARD ── */}
      {/* Visible once the user has a saved profile. Contains:
          - Profile chip with edit button
          - Passkey setup panel (when unregistered)
          - The step-specific content (form / sending / sent / outcome) */}
      {hasProfile && (
        <div style={card}>

          {/* Profile chip — always visible inside the card for context */}
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
          {/* Only shown when step === 'form' so it doesn't compete with the
              send flow UI. Each sub-state of setupLinkState renders a different
              visual: buttons → spinner → waiting message → hidden (on success). */}

          {/* Idle: two send-link buttons (WhatsApp green, SMS gray) */}
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

          {/* Sending: link creation in progress */}
          {step === 'form' && passkeyStatus === 'unregistered' && setupLinkState === 'sending' && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '0.85rem', padding: '0.85rem 1.1rem', marginBottom: '1.25rem', textAlign: 'center', color: '#1e40af', fontSize: '0.88rem' }}>
              ⏳ {lang === 'he' ? 'יוצר קישור…' : 'Creating link…'}
            </div>
          )}

          {/* Waiting: link sent, polling for the user to tap and complete biometric setup */}
          {step === 'form' && passkeyStatus === 'unregistered' && (setupLinkState === 'sent-wa' || setupLinkState === 'sent-sms' || setupLinkState === 'waiting') && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '0.85rem', padding: '1rem 1.1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e40af', marginBottom: '0.4rem' }}>📲 {setupLinkState === 'sent-wa' ? t.passkeySetupSent : t.passkeySetupSentSms}</div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>⏳ {t.passkeySetupWaiting}</div>
            </div>
          )}

          {/* Registered / success: passkey exists; no re-registration option shown */}
          {step === 'form' && (passkeyStatus === 'registered' || passkeyStatus === 'success') && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '0.85rem', padding: '0.75rem 1.1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#15803d' }}>
                {passkeyStatus === 'success' ? t.passkeySuccess : t.passkeyRegistered}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{t.passkeyRegisteredDesc}</div>
            </div>
          )}

          {/* Error: setup failed; shows error message and a retry button */}
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

          {/* ── step === 'form': blocked state — passkey not yet registered ── */}
          {/* Shown when the user has a profile but hasn't completed their own biometric
              setup yet. The setup panel above remains visible so they can proceed. */}
          {step === 'form' && passkeyStatus !== 'registered' && passkeyStatus !== 'success' && passkeyStatus !== 'checking' && passkeyStatus !== 'unknown' && (
            <div style={{ background: '#fef9c3', border: '1.5px solid #fde68a', borderRadius: '0.85rem', padding: '0.85rem 1.1rem', marginBottom: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#92400e', marginBottom: '0.25rem' }}>🔒 {t.sendBlockedTitle}</div>
              <p style={{ color: '#78350f', fontSize: '0.82rem', margin: 0 }}>{t.sendBlockedDesc}</p>
            </div>
          )}

          {/* ── step === 'form': send form ── */}
          {/* Only shown once the user has a registered passkey. */}
          {step === 'form' && (passkeyStatus === 'registered' || passkeyStatus === 'success') && (
            <>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#111', marginTop: 0 }}>{t.formTitle}</h2>

              {/* Platform toggle — segmented control for WhatsApp / SMS / Email */}
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
                {/* Recipient field — switches between email and phone depending on platform */}
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
                    {/* Inline email picker — shown when contact has multiple emails */}
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
                    {/* Inline number picker — shown when contact has multiple numbers */}
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

                {/* Message textarea — pre-filled with the locale default; editable */}
                <div>
                  <label style={labelStyle}>{t.labelMessage}</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 } as React.CSSProperties}
                    value={message} onChange={e => setMessage(e.target.value)} />
                </div>

                {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{error}</p>}

                {/* Primary send button — uses the currently selected platform */}
                <button style={btnPrimary} onClick={() => handleSend()}>
                  {platform === 'whatsapp' ? t.sendWhatsApp : platform === 'sms' ? t.sendSMS : t.sendEmail}
                </button>

                {/* Secondary button — sends via the other phone-based channel.
                    Hidden when email is selected (no obvious alternative). */}
                {platform !== 'email' && (
                  <button onClick={() => handleSend(platform === 'whatsapp' ? 'sms' : 'whatsapp')}
                    style={{ ...btnPrimary, background: 'transparent', color: '#6b7280', fontSize: '0.85rem', border: '1.5px solid #e5e7eb', marginTop: 0 }}>
                    {platform === 'whatsapp' ? t.sendSMS : t.sendWhatsApp}
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── step === 'sending': spinner ── */}
          {/* Shown while the /api/requests POST is in flight. */}
          {step === 'sending' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
              <p style={{ color: '#6b7280' }}>{t.sending}</p>
            </div>
          )}

          {/* ── step === 'sent': waiting for recipient ── */}
          {/* Shows the verify link, resend buttons for other channels, and a
              status indicator. The polling effect runs in the background. */}
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

              {/* Raw verify URL — lets the sender copy and share manually if needed */}
              <div style={{ background: '#f9fafb', borderRadius: '0.75rem', padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#374151', wordBreak: 'break-all', direction: 'ltr', textAlign: 'left' }}>
                <strong>{t.verifyLinkLabel}</strong><br />
                <a href={verifyUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{verifyUrl}</a>
              </div>

              {/* Resend via alternative channels — filtered to exclude the one already used */}
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

              {/* Waiting indicator with 1-minute expiry note */}
              <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', background: '#fef9c3', borderRadius: '0.75rem', fontSize: '0.875rem', color: '#854d0e', textAlign: 'center' }}>
                ⏳ {t.waitingDesc(sentRecipient)}<br />
                <span style={{ fontSize: '0.8rem', color: '#92400e' }}>{t.pollNote}</span>
              </div>

              {/* Escape hatch — lets the sender abandon this request and start a new one */}
              <button onClick={handleReset} style={{ width: '100%', marginTop: '1rem', background: 'transparent', border: 'none', color: '#6b7280', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
                {t.sendAnother}
              </button>
            </>
          )}

          {/* ── step === 'approved': success outcome ── */}
          {step === 'approved' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', marginBottom: '0.5rem' }}>{t.approved}</h2>
              <p style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{t.approvedDesc(sentRecipient)}</p>
              <button style={btnPrimary} onClick={handleReset}>{t.sendAnother}</button>
            </div>
          )}

          {/* ── step === 'declined': recipient pressed Decline ── */}
          {step === 'declined' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>❌</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#dc2626', marginBottom: '0.5rem' }}>{t.declined}</h2>
              <p style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{t.declinedDesc}</p>
              <button style={btnPrimary} onClick={handleReset}>{t.tryAgain}</button>
            </div>
          )}

          {/* ── step === 'expired': 1-minute timer elapsed ── */}
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

      {/* ── Request History ── */}
      {/* Collapsible list of the last 10 completed requests.
          Hidden entirely when there are no entries yet. */}
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

    </main>
  );
}
