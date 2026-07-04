'use client';

import { useState, useEffect, useRef } from 'react';

function sha256hex(str: string): Promise<string> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then((buf) =>
    Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

type Step = 'form' | 'sending' | 'sent' | 'approved' | 'declined';

export default function HomePage() {
  const [step, setStep] = useState<Step>('form');
  const [myName, setMyName] = useState('');
  const [myPhone, setMyPhone] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [message, setMessage] = useState('Please verify your identity so I know it\'s really you.');
  const [error, setError] = useState('');
  const [verifyUrl, setVerifyUrl] = useState('');
  const [requestId, setRequestId] = useState('');
  const [status, setStatus] = useState('pending');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Pre-fill name/phone from localStorage
    const saved = localStorage.getItem('verikey_me');
    if (saved) {
      try {
        const { name, phone } = JSON.parse(saved);
        if (name) setMyName(name);
        if (phone) setMyPhone(phone);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (step === 'sent') {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/requests/${requestId}/status`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'approved') {
              setStatus('approved');
              setStep('approved');
              clearInterval(pollRef.current!);
            } else if (data.status === 'declined') {
              setStatus('declined');
              setStep('declined');
              clearInterval(pollRef.current!);
            }
          }
        } catch {}
      }, 4000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, requestId]);

  async function handleSend() {
    setError('');
    const myPhoneNorm = normalizePhone(myPhone);
    const recipientPhoneNorm = normalizePhone(recipientPhone);

    if (!myName.trim()) { setError('Enter your name.'); return; }
    if (myPhoneNorm.length < 7) { setError('Enter your phone number.'); return; }
    if (recipientPhoneNorm.length < 7) { setError("Enter the recipient's phone number."); return; }
    if (!message.trim()) { setError('Enter a message.'); return; }

    setStep('sending');

    const [myHash, recipientHash] = await Promise.all([
      sha256hex('verikey-salt' + myPhoneNorm),
      sha256hex('verikey-salt' + recipientPhoneNorm),
    ]);

    // Save for next time
    localStorage.setItem('verikey_me', JSON.stringify({ name: myName.trim(), phone: myPhone }));

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
        const data = await res.json();
        setError(data.error ?? 'Something went wrong.');
        setStep('form');
        return;
      }

      const data = await res.json();
      setVerifyUrl(data.verification_url);
      setRequestId(data.id);

      const text = encodeURIComponent(
        `${myName.trim()} is asking you to verify your identity. Tap here: ${data.verification_url}`
      );
      const waUrl = `https://wa.me/${recipientPhoneNorm}?text=${text}`;
      window.open(waUrl, '_blank');

      setStep('sent');
    } catch {
      setError('Network error. Please try again.');
      setStep('form');
    }
  }

  function handleSendSMS() {
    const text = encodeURIComponent(
      `${myName.trim()} is asking you to verify your identity. Tap here: ${verifyUrl}`
    );
    window.open(`sms:${normalizePhone(recipientPhone)}?body=${text}`, '_blank');
  }

  function handleReset() {
    setStep('form');
    setVerifyUrl('');
    setRequestId('');
    setStatus('pending');
    setError('');
    setRecipientPhone('');
  }

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

  const btnSecondary: React.CSSProperties = {
    ...btnPrimary,
    background: '#16a34a',
    marginTop: '0.75rem',
  };

  const card: React.CSSProperties = {
    background: '#fff',
    borderRadius: '1.25rem',
    boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
    padding: '2rem 1.5rem',
    width: '100%',
    maxWidth: 420,
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: '#f0f4ff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '2rem 1rem',
    }}>
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🔐</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a8a', margin: 0 }}>VeriKey</h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Biometric identity verification — no app needed
        </p>
      </div>

      <div style={card}>
        {step === 'form' && (
          <>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', color: '#111' }}>
              Send a verification request
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Your name</label>
                <input style={inputStyle} placeholder="e.g. David Cohen" value={myName} onChange={e => setMyName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Your phone number</label>
                <input style={inputStyle} type="tel" placeholder="+1 555 000 0001" value={myPhone} onChange={e => setMyPhone(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Recipient's phone number</label>
                <input style={inputStyle} type="tel" placeholder="+1 555 000 0002" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Message</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 72 } as React.CSSProperties}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>
              {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{error}</p>}
              <button style={btnPrimary} onClick={handleSend}>
                Send via WhatsApp 💬
              </button>
            </div>
          </>
        )}

        {step === 'sending' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
            <p style={{ color: '#6b7280' }}>Creating verification link…</p>
          </div>
        )}

        {step === 'sent' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2.5rem' }}>✅</div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>WhatsApp opened!</h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                Send the message to {recipientPhone}. We're waiting for them to verify.
              </p>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: '0.75rem', padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#374151', wordBreak: 'break-all' }}>
              <strong>Verification link:</strong><br />
              <a href={verifyUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{verifyUrl}</a>
            </div>

            <button style={{ ...btnSecondary, background: '#0891b2' }} onClick={handleSendSMS}>
              Send via SMS instead 📱
            </button>

            <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: '#fef9c3', borderRadius: '0.75rem', fontSize: '0.875rem', color: '#854d0e', textAlign: 'center' }}>
              ⏳ Waiting for <strong>{recipientPhone}</strong> to verify…<br />
              <span style={{ fontSize: '0.8rem', color: '#92400e' }}>This page checks automatically every 4 seconds.</span>
            </div>

            <button onClick={handleReset} style={{ width: '100%', marginTop: '1rem', background: 'transparent', border: 'none', color: '#6b7280', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
              Send another request
            </button>
          </>
        )}

        {step === 'approved' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', marginBottom: '0.5rem' }}>Identity Verified!</h2>
            <p style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              <strong>{recipientPhone}</strong> confirmed their identity with biometrics.
            </p>
            <button style={btnPrimary} onClick={handleReset}>
              Send another request
            </button>
          </div>
        )}

        {step === 'declined' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>❌</div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#dc2626', marginBottom: '0.5rem' }}>Declined</h2>
            <p style={{ color: '#374151', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              The recipient declined the verification request.
            </p>
            <button style={btnPrimary} onClick={handleReset}>
              Try again
            </button>
          </div>
        )}
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center', maxWidth: 380 }}>
        Phone numbers are hashed locally and never stored in plain text.<br />
        Biometric verification uses WebAuthn / Passkeys — no password needed.
      </p>
    </main>
  );
}
