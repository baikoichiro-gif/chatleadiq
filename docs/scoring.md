# Scoring

ChatLeadIQ is AI-first when an AI provider key is configured. AI reads recent MySQL chat history and produces:

- lead status
- overall score
- buying intent
- urgency
- budget fit
- product match
- sentiment
- reply priority
- spam risk
- detected buying signals, objections, opt-out signals, and time signals

The rule analyzer exists as fallback and safety baseline when AI is unavailable or `AI_ANALYZER_REQUIRED=false`.

Important safety/fallback rules:

- Invoice, rekening, transfer, alamat, or PO -> `HOT_NOW`.
- Diskusi dulu dengan bos -> `FOLLOW_UP_TOMORROW` and `APPROVAL_NEEDED`.
- Jangan hubungi, stop, tidak usah -> `DO_NOT_CONTACT_YET`.
- Last message from sales -> `WAITING_CUSTOMER`.
- More than 3 sales messages without customer reply -> high spam risk.
