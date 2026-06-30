# VeriKey

Biometric identity verification for the modern age. VeriKey lets you send a verification link to anyone — they tap it, authenticate with Face ID or Fingerprint, and you get real-time confirmation it's really them.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup](#setup)
4. [Database Setup](#database-setup)
5. [Environment Variables](#environment-variables)
6. [Running Locally](#running-locally)
7. [Deployment](#deployment)
8. [Universal Links / App Links Configuration](#universal-links--app-links-configuration)
9. [Testing on Real Devices](#testing-on-real-devices)
10. [MVP Limitations & v2 Upgrade Paths](#mvp-limitations--v2-upgrade-paths)

---

## Overview

VeriKey solves a simple problem: how do you know the person on the other end of a text or call is who they say they are?

**Flow:**

1. The **requester** opens the VeriKey mobile app, picks a contact, and taps "Send via WhatsApp" or "Send via SMS".
2. The recipient gets a message with a unique verification link.
3. They tap the link — it opens in their browser (or in-app browser on iOS/Android).
4. They enter their phone number and authenticate with Face ID or Fingerprint (WebAuthn passkey).
5. The requester's app shows a real-time status update: **Approved**.

No passwords. No OTPs. Just biometrics.

---

## Architecture

```
+--------------------------------------------------+
|                 Monorepo (VeriKey/)              |
|                                                  |
|  +--------------------+  +--------------------+ |
|  |  web/ (Next.js 14) |  |  mobile/ (Expo RN) | |
|  |                    |  |                    | |
|  |  App Router        |  |  Expo Router       | |
|  |  |- /              |  |  |- / (Home)       | |
|  |  |- /verify/[token]|  |  |- /request       | |
|  |  +- /api/          |  |  +- /verify/[token]| |
|  |     |- requests    |  |     (deep link)    | |
|  |     |- verify      |  +--------------------+ |
|  |     +- webauthn    |                         |
|  +--------------------+                         |
|            |                                    |
|            v                                    |
|  +--------------------+                         |
|  |  PostgreSQL (DB)   |                         |
|  |  |- users          |                         |
|  |  |- credentials    |                         |
|  |  +- verification_  |                         |
|  |     requests       |                         |
|  +--------------------+                         |
+--------------------------------------------------+
```

**Key technologies:**

| Layer | Technology |
|---|---|
| Web app + API | Next.js 14 (App Router) |
| Mobile app | Expo (React Native, managed workflow) |
| Biometric auth | WebAuthn / Passkeys (`@simplewebauthn/server`, `@simplewebauthn/browser`) |
| Database | PostgreSQL (Supabase, Neon, or self-hosted) |
| Universal Links | Apple App Site Association + Android Asset Links |
| Message delivery | WhatsApp deep link + SMS fallback |

---

## Setup

### Prerequisites

- **Node.js 20+** — `node --version`
- **npm 9+** (comes with Node 20) — `npm --version`
- **PostgreSQL** — Supabase (free tier), Neon (free tier), or a local install
- **Expo CLI** — `npm install -g expo-cli` (optional, for mobile development)
- **iOS Simulator** or **Android Emulator** (or real devices) for mobile testing

### Install dependencies

```bash
# From the repo root -- installs both web/ and mobile/ workspaces
npm install
```

---

## Database Setup

1. Create a PostgreSQL database (Supabase / Neon free tier recommended).
2. Copy your connection string -- it looks like:
   `postgresql://user:password@host:5432/verikey`
3. Run the migration:

```bash
psql "$DATABASE_URL" -f db/migrations/001_initial.sql
```

Or paste the contents of `db/migrations/001_initial.sql` into the Supabase/Neon SQL editor.

---

## Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example web/.env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_BASE_URL` | Your public domain (e.g. `https://verikey.yourdomain.com`) |
| `WEBAUTHN_RP_ID` | WebAuthn Relying Party ID -- must match your domain (e.g. `yourdomain.com`) |
| `WEBAUTHN_RP_NAME` | Human-readable app name shown during passkey prompts |
| `CHALLENGE_SECRET` | 32-byte hex string for signing challenge cookies (generate: `openssl rand -hex 32`) |
| `EXPO_PUBLIC_API_URL` | API base URL for the mobile app -- same as `NEXT_PUBLIC_BASE_URL` |

> **Security note:** `WEBAUTHN_RP_ID` must exactly match the domain users visit in their browser. For local dev, use `localhost` and `http://localhost:3000`.

---

## Running Locally

### Web (Next.js)

```bash
# Set up environment variables first
cp .env.example web/.env.local
# Edit web/.env.local with your DATABASE_URL, etc.

npm run dev:web
# -> http://localhost:3000
```

### Mobile (Expo)

```bash
npm run dev:mobile
# -> Opens Expo DevTools. Scan QR code with Expo Go app on your phone,
#    or press 'i' for iOS Simulator / 'a' for Android Emulator.
```

> **Note:** For WebAuthn to work, the web server must be served over HTTPS with a real domain. For local mobile testing, you can still test the UI flows; biometric verification requires a deployed web server. See [Deployment](#deployment).

---

## Deployment

### Web -- Vercel (recommended)

1. Push your code to GitHub.
2. Import the repo in [Vercel](https://vercel.com).
3. Set the **Root Directory** to `web/`.
4. Add environment variables in the Vercel dashboard (Settings -> Environment Variables).
5. Deploy.

Vercel automatically handles HTTPS, which is required for WebAuthn.

### Database -- Neon or Supabase

Both offer a free tier with a connection string you can drop straight into `DATABASE_URL`.

### Mobile -- Expo EAS Build

```bash
npm install -g eas-cli
cd mobile
eas build --platform all
```

Follow the [Expo EAS Build docs](https://docs.expo.dev/build/introduction/) for app store submission.

---

## Universal Links / App Links Configuration

Universal Links (iOS) and App Links (Android) allow the verification link to open directly in the VeriKey app when it's installed, instead of the browser.

### iOS -- Apple App Site Association

1. Edit `web/public/apple-app-site-association`:
   - Replace `TEAMID` with your Apple Developer Team ID (found in [Apple Developer portal](https://developer.apple.com/account/)).
2. After deploying, verify it's accessible at:
   `https://yourdomain.com/apple-app-site-association`
   -- it must return `Content-Type: application/json` (already configured in `web/next.config.js`).
3. In `mobile/app.json`, replace `yourdomain.com` with your actual domain in `associatedDomains`.
4. Rebuild the iOS app with EAS Build for the entitlement to take effect.

### Android -- Asset Links

1. Generate your app's SHA-256 signing certificate fingerprint:
   ```bash
   keytool -printcert -jarfile your-app.apk
   # or from your keystore:
   keytool -list -v -keystore your-keystore.jks
   ```
2. Edit `web/public/.well-known/assetlinks.json` -- replace `YOUR_SHA256_CERT_FINGERPRINT` with the value from above.
3. Verify it's accessible at: `https://yourdomain.com/.well-known/assetlinks.json`
4. In `mobile/app.json`, replace `yourdomain.com` with your actual domain in the intent filter.

---

## Testing on Real Devices

### End-to-End Test (Two Phones)

**Phone A -- Requester (has VeriKey app installed):**

1. Open VeriKey app.
2. Tap "Request Verification".
3. Pick Phone B's contact from your address book.
4. Tap "Send via WhatsApp".
5. WhatsApp opens with a pre-filled message containing the verification link.
6. Send the message to Phone B.

**Phone B -- Recipient (no app needed):**

1. Tap the verification link in WhatsApp.
2. The link opens in the browser (or in-app browser).
3. Enter your phone number when prompted.
4. If first time: tap "Set up Biometric Verification" -> authenticate with Face ID/Fingerprint -> passkey is created.
5. If returning: tap "Approve with Face ID / Fingerprint" -> authenticate.
6. You see "Identity Confirmed".

**Back on Phone A:**
- The app polls every 4 seconds and updates the status badge to **Approved**.

### WebAuthn on Mobile Browsers

- **iOS Safari** and **Chrome on Android 9+** support WebAuthn.
- Face ID works in Safari on iOS 16+.
- Fingerprint works in Chrome on Android with a compatible sensor.
- The Expo in-app browser (`expo-web-browser`) opens the system browser under the hood, which has access to biometric APIs.

---

## MVP Limitations & v2 Upgrade Paths

### Current Limitations

| Area | MVP Approach | Issue |
|---|---|---|
| Challenge storage | In-memory `Map` | Lost on server restart; does not scale horizontally |
| Rate limiting | In-memory `Map` | Same as above |
| Requester identity | UUID in mobile app state | Lost on app reinstall; no real auth |
| Phone hashing | Simple client-side hash | Phone B must enter their number manually; no automatic lookup |
| Notifications | Polling every 4s | Inefficient; misses updates if app is backgrounded |

### v2 Upgrade Paths

- **Challenge + rate-limit storage -> Redis** with TTL. Drop-in replacement for the in-memory Maps.
- **Push notifications -> Expo Push Notifications + APNs/FCM**. Replace polling with a push from the server when a request is approved/rejected.
- **Requester authentication -> phone-based auth** (SMS OTP or passkey). Store requester profile in DB with a verified phone number.
- **Automatic phone lookup** -- if the requester's contact list is on file, skip the phone input step on the recipient side.
- **Request history** -- store request IDs in AsyncStorage and display recent requests with live status on the home screen.
- **Credential backup** -- use passkey sync (iCloud Keychain, Google Password Manager) so users do not lose credentials when switching devices.
- **Audit log** -- append-only log of all verification events for compliance.
- **Multi-device passkeys** -- register multiple passkeys per user (one per device).
- **Expiry cron** -- schedule `DELETE FROM verification_requests WHERE created_at < NOW() - INTERVAL '30 days'` via pg_cron, Supabase Edge Functions, or a Vercel Cron Job.
