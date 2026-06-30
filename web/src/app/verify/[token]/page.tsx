'use client';

import { useState, useEffect, useCallback } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

async function hashPhone(phone: string): Promise<string> {
  const data = new TextEncoder().encode(phone + 'verikey-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

type RequestDetails = {
  requester_name: string;
  message_text: string;
  status: string;
};

type FlowState = 'idle' | 'loading' | 'phone-input' | 'register' | 'authenticate' | 'success' | 'declined' | 'expired' | 'error';

export default function VerifyPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [flowState, setFlowState] = useState<FlowState>('loading');
  const [phone, setPhone] = useState('');
  const [phoneHash, setPhoneHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    async function loadRequest() {
      try {
        const res = await fetch(`/api/verify/${token}`);
        if (res.status === 410) {
          setFlowState('expired');
          return;
        }
        if (!res.ok) {
          setFlowState('error');
          setErrorMsg('Verification link not found or invalid.');
          return;
        }
        const data: RequestDetails = await res.json();
        setRequestDetails(data);
        if (data.status === 'approved') {
          setFlowState('success');
        } else if (data.status === 'rejected') {
          setFlowState('declined');
        } else {
          setFlowState('phone-input');
        }
      } catch {
        setFlowState('error');
        setErrorMsg('Failed to load verification request.');
      }
    }
    loadRequest();
  }, [token]);

  const handlePhoneSubmit = useCallback(async () => {
    if (!phone.trim()) return;
    setFlowState('loading');
    try {
      const hash = await hashPhone(phone.trim());
      setPhoneHash(hash);

      // Try auth options — if 404, user has no credentials yet → registration flow
      const authRes = await fetch('/api/webauthn/auth/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number_hash: hash, token }),
      });

      if (authRes.status === 404) {
        setFlowState('register');
      } else if (authRes.ok) {
        setFlowState('authenticate');
      } else {
        const body = await authRes.json().catch(() => ({}));
        setFlowState('error');
        setErrorMsg(body.error ?? 'Unexpected error checking credentials.');
      }
    } catch {
      setFlowState('error');
      setErrorMsg('Failed to check credentials. Please try again.');
    }
  }, [phone, token]);

  const handleRegister = useCallback(async () => {
    setFlowState('loading');
    setStatusMsg('Setting up your biometric credential…');
    try {
      const optRes = await fetch('/api/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number_hash: phoneHash, display_name: phone }),
      });
      if (!optRes.ok) throw new Error('Failed to get registration options');
      const options = await optRes.json();

      const regResponse = await startRegistration(options);

      const verRes = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number_hash: phoneHash, registration_response: regResponse, token }),
      });
      if (!verRes.ok) throw new Error('Registration verification failed');

      setFlowState('success');
    } catch (err: unknown) {
      setFlowState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed.');
    }
  }, [phoneHash, phone, token]);

  const handleAuthenticate = useCallback(async () => {
    setFlowState('loading');
    setStatusMsg('Waiting for biometric confirmation…');
    try {
      const optRes = await fetch('/api/webauthn/auth/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number_hash: phoneHash, token }),
      });
      if (!optRes.ok) throw new Error('Failed to get authentication options');
      const options = await optRes.json();

      const authResponse = await startAuthentication(options);

      const verRes = await fetch('/api/webauthn/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number_hash: phoneHash, token, auth_response: authResponse }),
      });
      if (!verRes.ok) throw new Error('Authentication verification failed');

      setFlowState('success');
    } catch (err: unknown) {
      setFlowState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
    }
  }, [phoneHash, token]);

  const handleDecline = useCallback(async () => {
    try {
      await fetch(`/api/verify/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', phone_number_hash: phoneHash }),
      });
    } catch {
      // ignore
    }
    setFlowState('declined');
  }, [token, phoneHash]);

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

  if (flowState === 'loading') {
    return (
      <main style={containerStyle}>
        <p style={{ color: '#6b7280' }}>{statusMsg || 'Loading…'}</p>
      </main>
    );
  }

  if (flowState === 'expired') {
    return (
      <main style={containerStyle}>
        <div style={{ fontSize: '3rem' }}>⏰</div>
        <h1 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>Link Expired</h1>
        <p style={{ color: '#6b7280' }}>This verification link has expired. Please ask the requester to send a new one.</p>
      </main>
    );
  }

  if (flowState === 'error') {
    return (
      <main style={containerStyle}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h1 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>Something went wrong</h1>
        <p style={{ color: '#6b7280' }}>{errorMsg}</p>
      </main>
    );
  }

  if (flowState === 'success') {
    return (
      <main style={containerStyle}>
        <div style={{ fontSize: '3rem' }}>✅</div>
        <h1 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>Identity Confirmed</h1>
        <p style={{ color: '#6b7280' }}>Your biometric verification was successful.</p>
      </main>
    );
  }

  if (flowState === 'declined') {
    return (
      <main style={containerStyle}>
        <div style={{ fontSize: '3rem' }}>❌</div>
        <h1 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>Declined</h1>
        <p style={{ color: '#6b7280' }}>You declined this verification request.</p>
      </main>
    );
  }

  return (
    <main style={containerStyle}>
      {requestDetails && (
        <>
          <div style={{ fontSize: '2.5rem' }}>🔐</div>
          <h1 style={{ fontSize: '1.5rem', marginTop: '1rem', marginBottom: '0.5rem' }}>Identity Verification</h1>
          <p style={{ color: '#374151', marginBottom: '0.25rem' }}>
            <strong>{requestDetails.requester_name}</strong> is asking you to confirm your identity.
          </p>
          <p style={{ color: '#6b7280', fontStyle: 'italic', marginBottom: '1.5rem' }}>
            Reason: {requestDetails.message_text}
          </p>
        </>
      )}

      {flowState === 'phone-input' && (
        <>
          <p style={{ color: '#374151', marginBottom: '0.5rem' }}>Enter your phone number to verify:</p>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 000 0000"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
            onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
          />
          <button
            onClick={handlePhoneSubmit}
            style={{ ...btnStyle, background: '#2563eb', color: '#fff' }}
          >
            Continue
          </button>
        </>
      )}

      {flowState === 'register' && (
        <>
          <p style={{ color: '#374151', marginBottom: '1rem' }}>
            You don&apos;t have a passkey yet. Set up biometric verification to approve requests quickly in the future.
          </p>
          <button
            onClick={handleRegister}
            style={{ ...btnStyle, background: '#059669', color: '#fff' }}
          >
            Set up Biometric Verification
          </button>
          <button
            onClick={handleDecline}
            style={{ ...btnStyle, background: '#f3f4f6', color: '#374151' }}
          >
            Decline
          </button>
        </>
      )}

      {flowState === 'authenticate' && (
        <>
          <button
            onClick={handleAuthenticate}
            style={{ ...btnStyle, background: '#2563eb', color: '#fff', fontSize: '1.2rem', padding: '1.25rem' }}
          >
            Approve with Face ID / Fingerprint
          </button>
          <button
            onClick={handleDecline}
            style={{ ...btnStyle, background: '#f3f4f6', color: '#374151' }}
          >
            Decline
          </button>
        </>
      )}
    </main>
  );
}
