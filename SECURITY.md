# Security Policy

## Sensitive Data

Never commit:

- `.env`
- `data/`
- `baileys-auth/`
- WhatsApp session credentials
- MySQL dumps
- chat exports
- logs containing phone numbers or customer messages

## Built-In Safeguards

- API rate limiting.
- Helmet security headers.
- JWT admin login.
- Phone masking in logs.
- Audit logs for sensitive lead actions.
- No broadcast endpoint.
- No auto-send endpoint.
- `ENABLE_AUTO_SEND=false` by default.

## Reporting Vulnerabilities

Open a private security advisory or contact the maintainer with reproduction steps, impact, and suggested mitigation.
