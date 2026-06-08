# ChatLeadIQ

Open-source, consent-aware AI lead scoring CRM for WhatsApp sales conversations.

![MIT License](https://img.shields.io/badge/license-MIT-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933)
![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178c6)
![MySQL](https://img.shields.io/badge/MySQL-compatible-4479a1)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748)
![Baileys](https://img.shields.io/badge/Baileys-WhatsApp-25d366)
![Open Source](https://img.shields.io/badge/Open%20Source-yes-blue)
![No Auto Spam](https://img.shields.io/badge/No%20Auto%20Spam-enforced-red)
![Human in the loop](https://img.shields.io/badge/Human--in--the--loop-required-yellow)

> Hero screenshot placeholder: add `docs/assets/hero-dashboard.png` after the first hosted demo screenshot.

ChatLeadIQ connects to WhatsApp using a Node.js Baileys backend, stores authorized chat history in MySQL, scores customer buying intent, detects objections, recommends follow-up timing, and drafts human-approved replies without auto-spam.

## Why It Exists

WhatsApp sales teams often lose qualified leads because conversations are buried in chat history. ChatLeadIQ turns authorized WhatsApp conversations into a CRM workflow while respecting opt-out requests, cooldowns, and human approval.

## Key Features

- WhatsApp QR connection through Baileys.
- MySQL storage for contacts, chats, messages, leads, analysis, follow-ups, and audit logs.
- AI-first analyzer that reads chat history and scores every lead parameter.
- OpenAI or Gemini provider support with Zod validation and rule fallback.
- Lead statuses: hot, warm/follow-up, nurture, waiting, price objection, do-not-contact, won, lost.
- Suggested replies are draft-only and require human approval.
- Consent-aware safeguards, opt-out detection, spam risk scoring, and audit logs.
- Premium dark-mode CRM UI with dashboard, chats, leads, pipeline, follow-ups, analytics, settings, and connect pages.

## How It Works

WhatsApp connected via Baileys -> backend sync chat messages -> save to MySQL -> AI analyzer reads recent history -> safety/fallback rules apply only when needed -> dashboard displays priorities -> human reviews suggested reply.

## No Auto-Spam Policy

ChatLeadIQ is not a spammer, bulk sender, contact scraper, or auto-reply bot. The default `ENABLE_AUTO_SEND=false` is intentional, and the codebase does not expose a broadcast endpoint.

## Monorepo

```text
apps/api   Express, Socket.IO, Prisma, Baileys, analyzer
apps/web   Next.js dashboard and landing page
docs       Architecture, privacy, deployment, scoring docs
```

## Local Installation

1. Install Node.js 20+ and pnpm.
2. Create a MySQL database:

```sql
CREATE DATABASE chatleadiq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. Copy `.env.example` to `.env`.
4. Set `DATABASE_URL=mysql://root:@localhost:3306/chatleadiq`.
5. Install dependencies and prepare Prisma:

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

6. Open frontend `http://localhost:3000` and backend `http://localhost:4000`.
7. Login with `ADMIN_EMAIL` and `ADMIN_PASSWORD`, then open `/connect`, generate a QR, and scan it from WhatsApp Linked Devices.

## XAMPP / Local MySQL

Start Apache/MySQL from XAMPP, open phpMyAdmin, create the `chatleadiq` database, and use:

```env
DATABASE_URL=mysql://root:@localhost:3306/chatleadiq
```

## MySQL Hosting

Create a database/user from your hosting panel and set:

```env
DATABASE_URL=mysql://db_user:db_password@db_host:3306/db_name
```

Use utf8mb4 charset when available. The Prisma schema uses `LongText` instead of native JSON for broad cPanel/MySQL compatibility.

## Environment Variables

See `.env.example` for all variables. Important values:

- `JWT_SECRET`: change before production.
- `DATABASE_URL`: local or hosted MySQL connection string.
- `BAILEYS_AUTH_DIR`: writable server folder for WhatsApp session auth.
- `OPENAI_API_KEY`: optional.
- `GEMINI_API_KEY`: optional.
- `ENABLE_AI_ANALYZER`: AI enhancement toggle.
- `AI_ANALYZER_REQUIRED`: keep `true` when status/scoring must come from AI reasoning, not rule fallback.
- `AI_PROVIDER`: `auto`, `openai`, or `gemini`.
- `OPENAI_MODEL` / `GEMINI_MODEL`: model selection.
- `ANALYSIS_DEBOUNCE_MS`: delay before analyzing a chat after new messages arrive.
- `ANALYSIS_BACKFILL_BATCH_SIZE`: number of existing chats queued when WhatsApp connects or resync runs.
- `ENABLE_AUTO_SEND`: keep `false`.
- `FOLLOWUP_COOLDOWN_HOURS`: default 24.

## API Overview

- `GET /health`
- `POST /api/auth/login`
- `GET /api/database/status`
- `GET /api/whatsapp/status`
- `GET /api/whatsapp/qr`
- `POST /api/whatsapp/connect`
- `POST /api/whatsapp/disconnect`
- `POST /api/whatsapp/resync`
- `POST /api/analysis/run`
- `POST /api/analysis/backfill`
- `GET /api/chats`
- `POST /api/chats/:id/analyze`
- `GET /api/leads`
- `GET /api/leads/:id`
- `POST /api/leads/:id/do-not-contact`
- `GET /api/followups/today`
- `PATCH /api/settings`
- `GET /api/export/leads.csv`

## Docker

```bash
docker compose up --build
```

Services: MySQL 8, API, and web. The API mounts `./data:/app/data` for Baileys session storage.

## Web Hosting / VPS Deployment

ChatLeadIQ requires Node.js long-running process support, WebSocket support, writable file system for Baileys auth state, MySQL, and environment variables. PHP-only/static shared hosting cannot run the full app.

For cPanel Node.js App, upload the repo, install dependencies, build, use `apps/api/dist/index.js` as backend startup file, configure env vars, point `DATABASE_URL` to hosting MySQL, and ensure `BAILEYS_AUTH_DIR` is writable.

For VPS, install Node.js 20+, pnpm, MySQL, clone repo, set `.env`, run Prisma commands, build, run API and web with PM2, add Nginx reverse proxy, and enable HTTPS.

## Example Analysis

Customer: "Tolong kirim invoice dan nomor rekening hari ini."

AI result: `HOT_NOW`, high buying intent, high urgency, next action `kirim invoice`, suggested reply generated as a draft only.

## Roadmap

- Official WhatsApp Business API adapter.
- Encrypted chat storage.
- Product knowledge base.
- Custom scoring rules.
- Calendar reminders.
- CRM integrations.
- Mobile companion.
- Advanced analytics.

## Contributing

Issues and PRs are welcome. Keep changes aligned with the no-auto-spam policy and add tests for analyzer logic or sensitive workflows.

## Security

Read `SECURITY.md`. Never commit `.env`, `data/`, Baileys auth state, logs, or database dumps.

## Ethical Use

Read `ETHICAL_USE.md`. Use only WhatsApp accounts and conversations you are authorized to manage.

## Disclaimer

Baileys is an unofficial WhatsApp Web library. Follow WhatsApp/Meta terms and local messaging/privacy regulations. ChatLeadIQ does not guarantee compliance for your specific jurisdiction.

## License

MIT
