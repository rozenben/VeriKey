# VeriKey

אימות זהות ביומטרי — ללא התקנת אפליקציה.
VeriKey lets you send a verification link to anyone — they tap it, authenticate with Face ID or Fingerprint, and you get real-time confirmation it's really them.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start — Docker](#quick-start--docker)
4. [Setup](#setup)
5. [Database Setup](#database-setup)
6. [Environment Variables](#environment-variables)
7. [Running Locally](#running-locally)
8. [Deployment — Vercel](#deployment--vercel)
9. [MVP Limitations & v2 Upgrade Paths](#mvp-limitations--v2-upgrade-paths)

---

## Overview

VeriKey solves a simple problem: how do you know the person on the other end of a text or call is who they say they are?

**Everything runs in the browser — no app installation required on either side.**

### How it works

**Requester (Phone A):**
1. Open `your-app.vercel.app` in any phone browser.
2. Enter your name, your phone number, and the recipient's phone number.
3. Choose WhatsApp or SMS as your preferred platform — this is saved for next time.
4. Tap **Send** — WhatsApp (or the SMS app) opens with a pre-filled message containing a unique verification link.
5. The page polls every 4 seconds and shows **✅ Identity Verified** when the recipient approves.

**Recipient (Phone B) — no app needed:**
1. Tap the verification link in WhatsApp or SMS.
2. The link opens in the browser.
3. Enter your phone number.
4. **First time:** tap "Set up Biometric Verification" → authenticate with Face ID / Fingerprint → a passkey is created.
5. **Returning:** tap "Approve with Face ID / Fingerprint" → authenticate instantly.
6. You see "Identity Confirmed" — the requester is notified in real time.

No passwords. No OTPs. Just biometrics.

### Language & preferences

- **Hebrew is the default language** with full RTL layout. Switch to English with the toggle button.
- The country code (`+972` for Hebrew, `+1` for English) is pre-filled automatically.
- Your name, phone, language, and preferred platform (WhatsApp / SMS) are saved locally and restored on your next visit.

---

## Architecture

```
+------------------------------------------+
|            VeriKey (web/)                |
|                                          |
|  Next.js 14 (App Router)                 |
|  ├── /               ← Requester form    |
|  ├── /verify/[token] ← Recipient page    |
|  └── /api/                               |
|       ├── requests          (POST)       |
|       ├── requests/[id]/status (GET)     |
|       ├── verify/[token]    (GET, POST)  |
|       └── webauthn/                      |
|            ├── register/options          |
|            ├── register/verify           |
|            ├── auth/options              |
|            └── auth/verify               |
|                                          |
|  PostgreSQL                              |
|  ├── users                               |
|  ├── credentials                         |
|  └── verification_requests              |
+------------------------------------------+
```

| Layer | Technology |
|---|---|
| Web app + API | Next.js 14 (App Router) |
| Biometric auth | WebAuthn / Passkeys (`@simplewebauthn/server` v10, `@simplewebauthn/browser` v10) |
| Database | PostgreSQL (Neon or Supabase free tier recommended) |
| Message delivery | WhatsApp deep link + SMS |
| Hosting | Vercel (free tier, HTTPS required for WebAuthn) |

---

## Quick Start — Docker

Run the entire stack locally with no Node.js install required.

```bash
# 1. Clone the repo
git clone https://github.com/rozenben/VeriKey.git
cd VeriKey

# 2. Generate a secret key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Open docker-compose.yml → replace CHALLENGE_SECRET with the output above

# 3. Start everything
docker compose up --build
```

Open **http://localhost:3000**

> Biometric authentication requires HTTPS and won't work on plain localhost. See [DOCKER.md](./DOCKER.md) for how to expose the app to the internet using Vercel (free).

**Full Docker guide → [DOCKER.md](./DOCKER.md)**

---

## Setup

### Prerequisites

- **Node.js 20+**
- **npm 9+**
- **PostgreSQL** — [Neon](https://neon.tech) or [Supabase](https://supabase.com) free tier recommended

### Install dependencies

```bash
# From the repo root
npm install
```

---

## Database Setup

1. Create a PostgreSQL database on Neon or Supabase.
2. Copy the connection string (`postgresql://user:password@host:5432/verikey`).
3. Run the migrations in order:

```bash
psql "$DATABASE_URL" -f db/migrations/001_initial.sql
psql "$DATABASE_URL" -f db/migrations/002_extend_expiry.sql
```

Or paste each file's contents into the Supabase / Neon SQL editor.

---

## Environment Variables

```bash
cp .env.example web/.env.local
# Edit web/.env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_BASE_URL` | Your public URL — **must match your Vercel deployment URL exactly** (e.g. `https://my-app.vercel.app`) |
| `WEBAUTHN_RP_ID` | Domain only, no protocol (e.g. `my-app.vercel.app`). Must match the domain users visit. |
| `WEBAUTHN_RP_NAME` | App name shown in biometric prompts (e.g. `VeriKey`) |
| `CHALLENGE_SECRET` | 32-byte hex secret — generate with `openssl rand -hex 32` |

> **Important:** `NEXT_PUBLIC_BASE_URL` is baked into the client bundle at build time. If it is wrong, verification links will point to the wrong domain and return 404. Always set it to the exact URL of your Vercel deployment before deploying.

> **Security note:** `WEBAUTHN_RP_ID` must exactly match the domain users visit. For local dev use `localhost` and `http://localhost:3000`.

---

## Running Locally

```bash
cp .env.example web/.env.local
# Edit web/.env.local with your DATABASE_URL, WEBAUTHN_RP_ID=localhost, etc.

npm run dev:web
# → http://localhost:3000
```

---

## Deployment — Vercel

1. Push your code to GitHub.
2. Import the repo at [vercel.com](https://vercel.com/new).
3. Set **Root Directory** to `web`.
4. Add all environment variables (Settings → Environment Variables).
5. Make sure **Deployment Protection** (Settings → Deployment Protection) is **off** so the app is publicly accessible.
6. Deploy.

### Vercel environment variable checklist

| Variable | Example value |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host/db` |
| `NEXT_PUBLIC_BASE_URL` | `https://my-app.vercel.app` ← your exact Vercel URL |
| `WEBAUTHN_RP_ID` | `my-app.vercel.app` |
| `WEBAUTHN_RP_NAME` | `VeriKey` |
| `CHALLENGE_SECRET` | _(output of `openssl rand -hex 32`)_ |

After changing environment variables, **redeploy** for them to take effect.

---

## MVP Limitations & v2 Upgrade Paths

### Current Limitations

| Area | MVP Approach | Issue |
|---|---|---|
| Challenge storage | In-memory `Map` | Lost on server restart; does not scale horizontally |
| Rate limiting | In-memory `Map` | Same as above |
| Requester identity | Name + hashed phone in localStorage | No verified auth; can be spoofed |
| Phone matching | Recipient enters number manually | No automatic lookup from requester's contacts |
| Notifications | Polling every 4 s | Inefficient; misses updates if tab is closed |

### v2 Upgrade Paths

- **Challenge + rate-limit storage → Redis** with TTL. Drop-in replacement for the in-memory Maps.
- **Push notifications → Web Push API or Expo Push**. Replace polling with a server push when a request is approved.
- **Requester authentication → passkey login**. Store requester profile in DB with a verified phone number.
- **Automatic phone lookup** — skip the phone input step for returning recipients.
- **Request history** — display past requests with live status on the home screen.
- **Credential backup** — passkey sync via iCloud Keychain / Google Password Manager.
- **Audit log** — append-only log of all verification events for compliance.
- **Expiry cron** — `DELETE FROM verification_requests WHERE created_at < NOW() - INTERVAL '30 days'` via pg_cron or a Vercel Cron Job.
