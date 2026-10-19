# Deploying to Railway (24/7)

This runs the dashboard + automation always-on, with a Postgres database and a
cron that sends reminders. You'll do this once; after that, `git push` redeploys.

## 0. One-time prep (local)

```bash
cd confirmit-app
git init && git add -A && git commit -m "Confirm It app"   # if not already a repo
```
Push it to a GitHub repo (Railway deploys from GitHub).

## 1. Create the project + database

1. Go to https://railway.app → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. In the project, **New → Database → PostgreSQL**. Railway provisions it and exposes `DATABASE_URL`.

## 2. Set the service variables

On the **app service** → *Variables*, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference the Postgres plugin) |
| `DASHBOARD_PASSWORD` | your dashboard password |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `CRON_SECRET` | `openssl rand -hex 16` |
| `NODE_ENV` | `production` |

> In production the app **refuses to log in** unless `DASHBOARD_PASSWORD` and
> `SESSION_SECRET` are both set — that's deliberate.

## 3. Deploy

Railway auto-builds with Nixpacks using `railway.json`:
- **Build:** `npm run build` (runs `prisma generate` then `next build`).
- **Pre-deploy:** `npm run release` → `prisma migrate deploy` (applies migrations to Postgres).
- **Start:** `npm run start` on Railway's `$PORT`.

Open the generated URL, log in, and seed a demo from the Orders page.

## 4. Add the cron (reminders)

The scheduler is an HTTP endpoint: `GET /api/cron` (protected by `CRON_SECRET`).

In the Railway project: **New → Empty Service** (or "Cron"), set:
- **Cron Schedule:** `*/5 * * * *` (every 5 minutes)
- **Start Command:**
  ```bash
  curl -fsS -H "x-cron-key: $CRON_SECRET" "$APP_URL/api/cron"
  ```
  Add `CRON_SECRET` (same value) and `APP_URL` (your app's public URL, e.g.
  `https://confirmit.up.railway.app`) as variables on this cron service.

A cron service runs its command once per tick and exits — exactly what we want.

## 5. Connect real WhatsApp

In the dashboard → **Settings**: turn off mock mode and enter your Meta **Phone
number ID**, **App secret**, and **Access token** (live mode only turns on when
all three are set). Copy the **Callback URL** + **Verify token** into Meta →
WhatsApp → Configuration.

> Meta's *API Setup* token expires in ~24h. For always-on sending, create a
> permanent **System User** token in Meta Business Settings and use that.

## Local development

```bash
docker compose up -d          # local Postgres on :5432
cp .env.example .env          # defaults point at that Postgres
npx prisma migrate dev        # apply migrations
npm run dev                   # http://localhost:3000
```

## Notes
- `/api/webhooks/*` and `/api/cron` are outside the password gate (they
  authenticate by signature / cron key). Everything else requires login.
- To switch to **Cloudflare** instead: deploy with `@opennextjs/cloudflare`, use
  **D1** for the database (Prisma D1 driver adapter), and a **Cron Trigger**
  calling `/api/cron`.
