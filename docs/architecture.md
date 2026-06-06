# Architecture

ChatLeadIQ flow:

WhatsApp via Baileys QR login -> realtime/history Message Sync -> MySQL -> debounced AI Analyzer queue -> Safety/Fallback Rules -> CRM Dashboard.

The API owns WhatsApp sessions, message persistence, analyzer jobs, audit logs, auth, exports, and Socket.IO events. The web app is a Next.js dashboard that reads API data and listens for realtime QR/status/analysis updates.

## Boundaries

- `apps/api/src/services/whatsapp`: QR login, session state, Baileys events.
- `apps/api/src/services/sync`: normalize and persist messages.
- `apps/api/src/services/analyzer`: AI-first scoring, debounced queue, backfill jobs, schema validation, safety fallback rules, persistence.
- `apps/web`: CRM UI and safe human-in-the-loop workflows.
