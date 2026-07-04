# VeriKey — Docker Guide

Run the full VeriKey stack locally with Docker (no Node.js installation required), and deploy it publicly with one command.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Run Locally with Docker](#run-locally-with-docker)
3. [Configuration](#configuration)
4. [Useful Docker Commands](#useful-docker-commands)
5. [Publish to the Internet (Vercel)](#publish-to-the-internet-vercel)
6. [Limitations on localhost vs Production](#limitations-on-localhost-vs-production)
7. [Disk & Resource Usage](#disk--resource-usage)

---

## Prerequisites

### 1. Install Docker Desktop

- Download from **https://www.docker.com/products/docker-desktop/**
- Run the installer and accept all defaults
- Restart your computer when prompted
- After restart, wait for Docker Desktop to show **"Engine running"** (green dot in the bottom-left)

### 2. Install Git

- Download from **https://git-scm.com/download/win**
- Run the installer and accept all defaults
- Open **Git Bash** from the Start Menu — use this for all commands below

---

## Run Locally with Docker

### Step 1 — Clone the repository

```bash
git clone https://github.com/rozenben/VeriKey.git
cd VeriKey
git checkout claude/implementation-usage-guide-g01nr9
```

### Step 2 — Generate a secret key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output string.

### Step 3 — Set your secret in docker-compose.yml

Open `docker-compose.yml` in any text editor (Notepad is fine).

Find this line:

```yaml
CHALLENGE_SECRET: change_this_to_a_random_64_char_hex_string
```

Replace the value with the string you copied in Step 2. Save the file.

### Step 4 — Start the stack

```bash
docker compose up --build
```

**What happens on first run:**

| Step | What Docker does |
|---|---|
| Downloads images | Pulls PostgreSQL 16 and Node.js 20 (~400 MB, one-time) |
| Builds the app | Compiles the Next.js app inside a container (~2–3 min) |
| Starts the database | Runs PostgreSQL and automatically applies the SQL migrations |
| Starts the web server | Serves the app on port 3000 |

When you see this, it is ready:

```
web-1  | ✓ Ready in Xs
```

### Step 5 — Open the app

Go to **http://localhost:3000** in your browser.

> **Note:** The app runs but biometric authentication (Face ID / Fingerprint) does **not** work on localhost because WebAuthn requires HTTPS. See [Publish to the Internet](#publish-to-the-internet-vercel) to enable that.

---

## Configuration

All settings are in `docker-compose.yml` under the `web` service's `environment` section:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | points to local `db` container | PostgreSQL connection string |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | Change to your public URL when deploying |
| `WEBAUTHN_RP_ID` | `localhost` | Must match the domain users visit — change when deploying |
| `WEBAUTHN_RP_NAME` | `VeriKey` | Name shown in the biometric prompt |
| `CHALLENGE_SECRET` | *(you set this)* | 32-byte hex string — keep this secret |

For production, do **not** put secrets in `docker-compose.yml`. Use environment variables or a secrets manager instead.

---

## Useful Docker Commands

```bash
# Start the stack (after first build)
docker compose up

# Start in background (no log output in terminal)
docker compose up -d

# Stop the stack
docker compose down

# Rebuild after code changes
docker compose up --build

# View logs
docker compose logs web
docker compose logs db

# Follow logs in real time
docker compose logs -f web

# Restart only the web server (faster than full rebuild)
docker compose restart web

# Open a PostgreSQL shell to inspect the database
docker compose exec db psql -U verikey -d verikey

# Delete everything including the database volume (fresh start)
docker compose down -v

# List running containers
docker compose ps
```

---

## Publish to the Internet (Vercel)

Vercel gives you a free HTTPS URL, which is required for biometric authentication to work.

### Step 1 — Set up a free database (Neon)

1. Go to **https://neon.tech** and sign up for free
2. Click **New Project**, name it `verikey`, click **Create**
3. Copy the **Connection string** (looks like `postgresql://user:pass@host/verikey`)
4. Click the **SQL Editor** tab, paste the contents of `db/migrations/001_initial.sql`, and click **Run**

### Step 2 — Deploy to Vercel

1. Go to **https://vercel.com** and sign up with your GitHub account
2. Click **Add New Project** → select `rozenben/VeriKey`
3. Set **Root Directory** to `web`
4. Add the following **Environment Variables** (Settings → Environment Variables):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `NEXT_PUBLIC_BASE_URL` | `https://your-app.vercel.app` *(fill in after first deploy)* |
| `WEBAUTHN_RP_ID` | `your-app.vercel.app` *(same domain, no https://)* |
| `WEBAUTHN_RP_NAME` | `VeriKey` |
| `CHALLENGE_SECRET` | The hex string you generated earlier |

5. Click **Deploy**

After the first deploy, Vercel gives you a URL like `https://verikey-abc123.vercel.app`. Go back to the environment variables, update `NEXT_PUBLIC_BASE_URL` and `WEBAUTHN_RP_ID` with this URL, then click **Redeploy**.

### Step 3 — Update the mobile app to point to your live URL

Open (or create) `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=https://your-app.vercel.app
```

Rebuild the mobile app if needed (`expo start` picks this up automatically in development).

### Step 4 — Verify everything works

Open `https://your-app.vercel.app` on your phone.

- The landing page loads
- Going to `/verify/<any-token>` shows the verification UI
- Tapping **Approve with Face ID / Fingerprint** triggers the OS biometric prompt

---

## Limitations on localhost vs Production

| Feature | localhost (Docker) | Production (Vercel + HTTPS) |
|---|---|---|
| Web app loads | ✅ | ✅ |
| API endpoints work | ✅ | ✅ |
| Database saves data | ✅ | ✅ |
| Biometric prompt (Face ID / Fingerprint) | ❌ Requires HTTPS | ✅ |
| Mobile app sends verification links | ✅ (points to localhost) | ✅ |
| Universal Links open app directly | ❌ | ✅ (after configuration) |

---

## Disk & Resource Usage

| Item | Size |
|---|---|
| PostgreSQL Docker image | ~80 MB |
| Node.js Alpine Docker image | ~130 MB |
| Built VeriKey web image | ~200 MB |
| Database volume (grows with use) | starts at ~10 MB |
| **Total on first run** | **~420 MB** |

RAM usage while running: approximately **200–300 MB** total for both containers.

To free all disk space used by this project:

```bash
docker compose down -v --rmi all
```
