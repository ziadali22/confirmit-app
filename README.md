# Confirm It — WhatsApp order-confirmation dashboard

A simple dashboard (built for non-devs) to confirm COD orders over WhatsApp:
send an interactive list message, the customer taps a payment option, and the
order is tagged, replied to, and confirmed automatically. Plus saved customers
and marketing campaigns.

**Stack:** Next.js 15 (App Router, server actions) · Prisma · SQLite (dev) →
Postgres/D1 (prod). Runs 24/7 on Railway/Render, or on Cloudflare.

## Run locally

```bash
npm install
npx prisma migrate dev        # creates the SQLite db
npm run dev                   # http://localhost:3000
```

Log in with the password in `.env` (`DASHBOARD_PASSWORD`, default `confirmit123`).
On the Orders page click **Seed demo** to get a ready-made message + sample order,
open it, **Send confirmation**, then tap an option — all in mock mode, no WhatsApp
account needed.

## The screens (what a merchant uses)

- **Orders** — create test orders, see status + tags, open the phone simulator.
- **Order view** — a WhatsApp phone mockup. Send the confirmation; tapping a row
  runs the real inbound flow (apply tag → send reply → confirm/cancel).
- **Message** — full control over the list message: header, body (with
  `{firstName} {shopName} {orderNumber} {total} {currency}` placeholders), section
  title, button text, and each option's label + order tag + reply + action. Live
  preview with Meta's character limits enforced.
- **Campaigns** — send a WhatsApp message to all opted-in customers.
- **Customers** — every ordering number saved, with a marketing opt-in toggle.
- **Settings** — your WhatsApp sender number, mock/live toggle, Meta Cloud API
  credentials, and the webhook URL + verify token to paste into Meta.

## Going live with real WhatsApp

1. **Settings** → turn **off** mock mode, enter your Meta **Phone number ID**,
   **App secret**, and **Access token**. Set your sender number.
2. Copy the **Callback URL** + **Verify token** from Settings into Meta → WhatsApp
   → Configuration. Localhost can't receive callbacks — expose it first:
   ```bash
   cloudflared tunnel --url http://localhost:3000   # or: ngrok http 3000
   ```
3. The interactive list is a *session* message — the customer must message your
   number first (opens the 24-hour window), or you send an approved template.
4. ⚠️ Registering a number as a WhatsApp Business sender removes it from the normal
   WhatsApp app. Use a spare number, not your personal one.

## 24/7 hosting

The automation needs a always-running server + a scheduler. The scheduler is
built from stored state (`Order.nextActionAt`) and exposed at `/api/cron` — no
in-memory timers, so it survives restarts. Point any cron at it.

**Railway / Render (simplest):**
- Deploy the Next app. Add a Postgres add-on and set `DATABASE_URL` (switch
  `prisma/schema.prisma` datasource `provider` to `postgresql`).
- Add a scheduled job hitting `GET /api/cron` every few minutes.

**Cloudflare (also works now that it's JavaScript):**
- Deploy with `@opennextjs/cloudflare`.
- Use **D1** for the database (SQLite-compatible; Prisma via its D1 driver adapter).
- Add a **Cron Trigger** that calls `/api/cron`.

`/api/webhooks/*` and `/api/cron` are intentionally outside the password gate; the
rest of the dashboard is behind `DASHBOARD_PASSWORD`.

## What's intentionally left out (v1)

Voice-call fallback, courier APIs (Bosta/Aramex), Paymob, and abandoned-cart
recovery are not in the UI — they can be added behind the same provider/flow
pattern (`src/lib/whatsapp.ts`, `src/lib/flow.ts`).
