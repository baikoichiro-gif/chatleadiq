# Deployment

## Local

Use XAMPP, Laragon, or Docker MySQL and run `pnpm dev`.

## Node.js Hosting

Requires long-running Node.js and WebSockets.

## VPS

Use Node.js 20+, pnpm, MySQL, PM2, Nginx, and HTTPS.

## Railway / Render / Fly.io

Deploy API and web as separate services. Attach MySQL from a managed provider. Add persistent storage for Baileys auth if the platform supports it.

## Docker

Use `docker compose up --build`.
