# VeriKey

Biometric identity verification — no app install required.

VeriKey lets you send a verification link to anyone. The recipient taps it, logs in with Face ID or Fingerprint (passkey), answers your question, and you get real-time confirmation it's really them — plus their answer and an optional note.

---

## Table of Contents

1. [Overview](#overview)
2. [How it works](#how-it-works)
3. [Architecture](#architecture)
4. [Quick Start — Docker](#quick-start--docker)
5. [Database Setup](#database-setup)
6. [Environment Variables](#environment-variables)
7. [Running Locally](#running-locally)
8. [Deployment — Vercel](#deployment--vercel)
9. [Known Limitations](#known-limitations)

---

## Overview

**Problem:** How do you know the person texting or calling you is really who they claim to be?

**Solution:** Send them a VeriKey link. They authenticate biometrically in their browser, answer your question (yes/no), and you get the result — including a fraud alert if they say no while someone else claims to be them.

Everything runs in the browser. No app installation required on either side.

---

## How it works

### Requester (you)

1. Open the app and sign up with your email address.
2. Receive a one-time code via email to confirm your address.
3. Register a passkey (Face ID / Fingerprint) on your device.
4. On the home screen: enter the recipient's email and your verification question (e.g. *"Did you just ask me to send you $500?"*).
5. Tap **Send** — an email is sent to the recipient with the verification link.
6. The page polls every few seconds. When the recipient completes verification you see the result: ✅ Confirmed YES, 🚨 Said NO (suspicious), or declined.

### Recipient

1. Tap the link in the email.
2. See the requester's name and verification question.
3. Answer **Yes** or **No** and optionally add a note.
4. Enter your email, receive a one-time code, and authenticate with your passkey.
   - **First time:** set up a passkey during this step.
   - **Returning:** authenticate instantly with the existing passkey.
5. Done — the requester is notified immediately.

### Result outcomes

| Recipient answered | Status shown to requester |
|---|---|
| Yes + biometric | ✅ Identity Verified — Confirmed |
| No + biometric | 🚨 Identity Verified — SUSPICIOUS (fraud warning sent) |
| Declined (no biometric) | ⚪ Verification Declined |

---

## Architecture

```
+------------------------------------------+
|            VeriKey (web/)                |
|                                          |
|  Next.js 14 (App Router)                 |
|  ├── /               ← Requester home    |
|  ├── /verify/[token] ← Recipient page    |
|  └── /api/                               |
|       ├── auth/                          |
|       │    └── me              (GET)     |
|       ├── account              (DELETE)  |
|       ├── config               (GET)     |
|       ├── otp/send             (POST)    |
|       ├── requests             (GET,POST)|
|       ├── requests/[id]/status (GET)     |
|       ├── verify/[token]       (GET,POST)|
|       └── webauthn/                      |
|            ├── register/options          |
|            ├── register/verify           |
|            ├── auth/options              |
|            └── auth/verify               |
|                                          |
|  PostgreSQL                              |
|  ├── users                               |
|  ├── credentials                         |
|  ├── verification_requests              |
|  ├── otp_codes                           |
|  └── api_tokens                          |
+------------------------------------------+
```

| Layer | Technology |
|---|---|
| Web app + API | Next.js 14 (App Router) |
| Biometric auth | WebAuthn / Passkeys (`@simplewebauthn/server` v10) |
| Email delivery | [Resend](https://resend.com) |
| Database | PostgreSQL (Neon or Supabase free tier) |
| Hosting | Vercel |

---

## Quick Start — Docker

Run the full stack locally with no Node.js install required.

```bash
# 1. Clone the repo
git clone https://github.com/rozenben/VeriKey.git
cd VeriKey

# 2. Generate secrets
openssl rand -hex 32   # → CHALLENGE_SECRET
openssl rand -hex 32   # → IDENTIFIER_HMAC_SECRET
openssl rand -hex 32   # → EMAIL_ENCRYPTION_KEY

# 3. Open docker-compose.yml and paste the generated values into the
#    corresponding environment variables.

# 4. Start everything
docker compose up --build
```

Open **http://localhost:3000**

> WebAuthn requires HTTPS. Biometric registration won't work on plain `http://localhost`. See [DOCKER.md](./DOCKER.md) for options to expose the app via a public HTTPS URL (e.g. Vercel or a tunnel).

**Full Docker guide → [DOCKER.md](./DOCKER.md)**

---

## Database Setup

1. Create a PostgreSQL database (Neon or Supabase free tier recommended).
2. Copy the connection string.
3. Run all migrations **in order**:

```bash
psql "$DATABASE_URL" -f db/migrations/001_initial.sql
psql "$DATABASE_URL" -f db/migrations/002_extend_expiry.sql
psql "$DATABASE_URL" -f db/migrations/003_email_otp_redesign.sql
psql "$DATABASE_URL" -f db/migrations/004_cleanup_triggers_and_encrypt_email.sql
psql "$DATABASE_URL" -f db/migrations/005_recipient_email_encrypted_and_account_ops.sql
psql "$DATABASE_URL" -f db/migrations/006_recipient_answer.sql
```

Or paste each file's contents into the Neon / Supabase SQL editor.

---

## Environment Variables

```bash
cp .env.example web/.env.local
# Edit web/.env.local
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Your public URL, e.g. `https://my-app.vercel.app`. Must match your deployment URL exactly — it is baked into the client bundle at build time and used to generate verification links. |
| `WEBAUTHN_RP_ID` | ✅ | Domain only, no protocol, e.g. `my-app.vercel.app`. Must match the domain users visit. Use `localhost` for local dev. |
| `WEBAUTHN_RP_NAME` | ✅ | App name shown in biometric prompts, e.g. `VeriKey`. |
| `CHALLENGE_SECRET` | ✅ | 32-byte hex secret for signing WebAuthn challenges. Generate: `openssl rand -hex 32` |
| `IDENTIFIER_HMAC_SECRET` | ✅ | 32-byte hex secret for HMAC-hashing emails (used as stable, non-reversible identifiers). Generate: `openssl rand -hex 32`. **Changing this invalidates all existing accounts.** |
| `EMAIL_ENCRYPTION_KEY` | ✅ | 32-byte hex key for AES-256 encrypting stored email addresses. Generate: `openssl rand -hex 32` |
| `RESEND_API_KEY` | ✅ | API key from [resend.com](https://resend.com). Required for OTP delivery and verification emails. |

> **Note:** `PHONE_HMAC_SECRET` is accepted as a fallback alias for `IDENTIFIER_HMAC_SECRET` during migration from older deployments.

---

## Running Locally

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example web/.env.local
# Edit web/.env.local — set WEBAUTHN_RP_ID=localhost, NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Run migrations (requires psql)
psql "$DATABASE_URL" -f db/migrations/001_initial.sql
# ... repeat for 002–006

# Start the dev server
npm run dev:web
# → http://localhost:3000
```

> Biometric registration requires HTTPS. For local testing use a browser that supports WebAuthn on localhost (Chrome and Firefox do), or expose the app via a tunnel.

---

## Deployment — Vercel

1. Push the repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Set **Root Directory** to `web`.
4. Add all environment variables (Settings → Environment Variables).
5. Turn off **Deployment Protection** (Settings → Deployment Protection) so the app is publicly accessible.
6. Deploy.
7. Run all six database migrations against your production database.

### Environment variable checklist

| Variable | Example |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host/db` |
| `NEXT_PUBLIC_BASE_URL` | `https://my-app.vercel.app` |
| `WEBAUTHN_RP_ID` | `my-app.vercel.app` |
| `WEBAUTHN_RP_NAME` | `VeriKey` |
| `CHALLENGE_SECRET` | _(32-byte hex)_ |
| `IDENTIFIER_HMAC_SECRET` | _(32-byte hex)_ |
| `EMAIL_ENCRYPTION_KEY` | _(32-byte hex)_ |
| `RESEND_API_KEY` | _(from resend.com)_ |

After changing any environment variable, **trigger a new deployment** for it to take effect.

---

## Known Limitations

| Area | Current approach | Impact |
|---|---|---|
| Challenge storage | In-memory `Map` | Lost on server restart; won't scale horizontally — use Redis for production |
| Rate limiting | In-memory `Map` | Same as above |
| Passkey per device | Each device registers its own passkey | Signing in from a new device requires re-authentication via email OTP to link the new passkey |
| No push notifications | Requester polls every 4 s | Tab must stay open; missed if closed before recipient responds |
