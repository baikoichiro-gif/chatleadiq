# Local Server

1. Install Node.js 20+.
2. Install pnpm.
3. Create MySQL database.
4. Copy `.env.example` to `.env`.
5. Run:

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

Frontend: `http://localhost:3000`

Backend: `http://localhost:4000`

Connect WhatsApp from `/connect` with QR login.
