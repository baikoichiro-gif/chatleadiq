# Privacy

ChatLeadIQ stores authorized chat history in your configured MySQL database and Baileys session credentials in `BAILEYS_AUTH_DIR`.

Safeguards:

- No auto-send.
- No broadcast.
- No contact scraping endpoint.
- Opt-out detection.
- Do-not-contact lead state.
- Audit logs for sensitive actions.
- Export warnings for backups.

Backups and exports can contain personal data. Store them securely and delete them when no longer needed.
