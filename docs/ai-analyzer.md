# AI Analyzer

The ChatLeadIQ analyzer is AI-first.

When `ENABLE_AI_ANALYZER=true` and an AI provider key is configured, AI reads the WhatsApp history from MySQL directly and produces:

- lead status
- every score parameter
- detected products, prices, quantities, locations, objections, signals, and opt-out intent
- decision stage
- next best action
- follow-up timing
- summary
- suggested reply draft

Rules are not the primary scorer when AI is available. Rules are used only as:

- a fallback when AI is disabled, missing, or fails and `AI_ANALYZER_REQUIRED=false`
- a safety backstop for opt-out/do-not-contact protection
- testable baseline behavior for local development

## Providers

Set one provider or leave auto:

```env
ENABLE_AI_ANALYZER=true
AI_ANALYZER_REQUIRED=false
AI_PROVIDER=auto
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
```

`AI_PROVIDER=auto` uses OpenAI when `OPENAI_API_KEY` exists, otherwise Gemini when `GEMINI_API_KEY` exists.

Set `AI_ANALYZER_REQUIRED=true` if you want analysis to fail instead of falling back to rules when no AI provider is available.

## Prompt Contract

AI receives:

- contact metadata
- consent status
- do-not-contact flag
- previous lead state
- max history configuration
- ordered chat history
- score rubric for all parameters
- safety rules
- output contract

The AI must return valid JSON matching the `LeadAnalysisResult` schema. Zod validation rejects malformed output.

AI cannot send messages. Suggested replies remain drafts and require human approval.

## Realtime And Backfill Flow

Analyzer execution is queued automatically:

- New WhatsApp messages are saved to MySQL, debounced with `ANALYSIS_DEBOUNCE_MS`, then analyzed with recent chat history.
- Baileys history sync messages are saved to MySQL and each touched chat is queued for analysis.
- When WhatsApp connects, existing MySQL chats are queued as a backfill batch.
- `/api/whatsapp/resync` and `/api/analysis/backfill` can queue existing chats again.

Socket.IO emits:

- `analysis:queued`
- `analysis:started`
- `lead:analyzed`
- `analysis:error`
- `analysis:backfill-queued`

Realtime analysis updates lead scores/status and refreshes the latest draft suggested reply or pending follow-up instead of creating duplicate drafts on every message.
