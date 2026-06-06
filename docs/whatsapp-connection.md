# WhatsApp Connection

ChatLeadIQ uses Baileys to connect through WhatsApp Web QR login.

- Auth state is stored in `BAILEYS_AUTH_DIR`.
- The folder is ignored by Git.
- QR events are emitted with Socket.IO.
- Reconnect is supported by the stored auth state.
- On every QR login attempt, the API fetches the current Baileys WhatsApp Web version before creating the socket. In the API log, `Using WhatsApp Web version for QR login` should show `isLatest: true`.
- Baileys init queries are disabled for stability because `fetchProps` can time out after login without blocking message sync or AI analysis.

## How to Pair

1. Open `/connect`.
2. Click **Generate QR**.
3. Open WhatsApp on your phone.
4. Go to **Settings > Linked devices > Link a device**.
5. Scan the QR shown in ChatLeadIQ.

## Troubleshooting

If WhatsApp fails to link:

- Click **Reset Session** and generate a new QR.
- Remove old linked devices from WhatsApp.
- Update WhatsApp mobile.
- Restart `pnpm dev`.
- Try another browser identity in `.env`:

```env
BAILEYS_BROWSER=ubuntu
# or windows, macos, baileys
```

Restart `pnpm dev` after changing this value.

Limitations: Baileys is unofficial and behavior can change when WhatsApp changes Web internals. Use only accounts and conversations you are authorized to manage.
