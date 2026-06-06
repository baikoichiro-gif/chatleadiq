# ChatLeadIQ Tutorial

## Local Server Mode

1. Install Node.js 20+.
2. Install pnpm: `npm install -g pnpm`.
3. Install XAMPP or Laragon and start MySQL.
4. Create database:

```sql
CREATE DATABASE chatleadiq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. Copy `.env.example` to `.env`.
6. Set `DATABASE_URL=mysql://root:@localhost:3306/chatleadiq`.
7. Run:

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

8. Open `http://localhost:3000`.
9. Login with the seeded admin.
10. Open `/connect`, enter your WhatsApp number with country code, then enter the pairing code in WhatsApp Linked Devices.

## MySQL Hosting Setup

1. Create a MySQL database and user from hosting panel.
2. Grant all privileges for that database.
3. Use a connection string like:

```env
DATABASE_URL=mysql://db_user:db_password@db_host:3306/db_name
```

4. Run migrations from local terminal or deployment shell:

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

## cPanel Node.js App Setup

Your hosting must support Node.js long-running apps and WebSockets.

1. Upload repo.
2. Set app root to the repo folder.
3. Install dependencies with pnpm or npm-compatible hosting tooling.
4. Run `pnpm build`.
5. Use `apps/api/dist/index.js` as backend startup file.
6. Configure environment variables in cPanel.
7. Ensure `BAILEYS_AUTH_DIR` points to a writable folder.
8. Deploy Next.js web separately if the host requires separate app entries.

## VPS Setup

1. Install Node.js 20+, pnpm, MySQL, Nginx, PM2.
2. Clone repo.
3. Set `.env`.
4. Run `pnpm install`, `pnpm db:push`, `pnpm db:seed`, `pnpm build`.
5. Start API and web with PM2.
6. Proxy `api.example.com` to port `4000` and `app.example.com` to port `3000`.
7. Enable HTTPS.

## Analyzer

Use `POST /api/chats/:id/analyze` or `POST /api/analysis/run` with `{ "chatId": 1 }`.

For true AI analysis, set at least one provider key:

```env
ENABLE_AI_ANALYZER=true
AI_PROVIDER=auto
OPENAI_API_KEY=your_openai_key
# or
GEMINI_API_KEY=your_gemini_key
```

Set `AI_ANALYZER_REQUIRED=true` if analysis must fail when AI is unavailable instead of falling back to rules.

## Push to GitHub

```bash
git add .
git commit -m "Initial ChatLeadIQ monorepo"
git push -u origin main
```

## Codex for OSS Checklist

- README explains purpose, safeguards, install, deployment, and roadmap.
- License is present.
- Ethical use and security docs are present.
- Tests cover analyzer and safety logic.
- No `.env`, sessions, or chat data committed.
- GitHub topics and description are set.

## Suggested GitHub Description

Open-source, consent-aware AI lead scoring CRM for WhatsApp sales conversations.

## Suggested GitHub Topics

`whatsapp`, `baileys`, `crm`, `lead-scoring`, `mysql`, `prisma`, `nextjs`, `nodejs`, `typescript`, `open-source`, `ai`, `sales-automation`, `human-in-the-loop`, `privacy`, `consent-aware`

## Draft Codex for OSS Answer

ChatLeadIQ is an open-source, consent-aware CRM assistant for WhatsApp sales conversations. It connects through a Node.js Baileys backend, stores authorized chat history in MySQL, scores buying intent, detects objections, avoids unwanted follow-ups, and prioritizes human-approved replies using transparent rules and optional AI. It is designed to improve sales follow-up quality without auto-spam, bulk messaging, or contact scraping.

API credits will be used to improve AI lead scoring, chat summarization, objection detection, multilingual suggested replies, issue triage, documentation, PR review, test generation, and release workflows. ChatLeadIQ keeps humans in the loop and does not send messages automatically.
