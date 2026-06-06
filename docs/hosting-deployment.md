# Hosting Deployment

ChatLeadIQ needs:

- Node.js long-running process.
- WebSocket support.
- Writable file system for Baileys session storage.
- MySQL database.
- Environment variables.
- Background process restart.

If shared hosting only supports PHP or static files, the full app cannot run.

## cPanel Node.js

Set startup file to `apps/api/dist/src/index.js` after build. Configure `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `API_URL`, and `BAILEYS_AUTH_DIR`.

## VPS

Use PM2 for API/web processes and Nginx reverse proxy with HTTPS.
