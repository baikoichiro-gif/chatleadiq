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

AI is the scorer by default. With `AI_ANALYZER_REQUIRED=true`, ChatLeadIQ does not silently replace AI judgement with rules. If the provider/model/key fails, analysis fails and emits `analysis:error` so the problem is visible.

Rules are not the primary scorer. Rules are used only as:

- an optional local fallback only when `AI_ANALYZER_REQUIRED=false`
- a safety backstop for opt-out/do-not-contact protection
- testable baseline behavior for local development

## Providers

Set one provider or leave auto:

```env
ENABLE_AI_ANALYZER=true
AI_ANALYZER_REQUIRED=true
AI_PROVIDER=auto
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
```

`AI_PROVIDER=auto` uses OpenAI when `OPENAI_API_KEY` exists, otherwise Gemini when `GEMINI_API_KEY` exists.

Keep `AI_ANALYZER_REQUIRED=true` when you want lead status and scoring to come from AI reasoning only.

## Prompt Contract

AI receives:

- contact metadata
- consent status
- do-not-contact flag
- previous lead state
- max history configuration
- ordered chat history
- score rubric for all parameters
- semantic lead status definitions
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
