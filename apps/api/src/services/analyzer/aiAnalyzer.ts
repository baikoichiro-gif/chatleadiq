import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { leadAnalysisSchema } from "./schema.js";
import type { AnalyzerMessage, LeadAnalysisResult } from "./types.js";

export type AiAnalyzerContext = {
  contact: {
    waJid: string;
    name?: string | null;
    pushName?: string | null;
    phone?: string | null;
    consentStatus: string;
    doNotContact: boolean;
    tags?: unknown;
  };
  previousLead?: {
    status: string;
    overallScore: number;
    decisionStage: string;
    followUpTiming: string;
    summary?: string | null;
  } | null;
  maxHistoryMessages: number;
};

export const CHATLEADIQ_SYSTEM_PROMPT = `You are ChatLeadIQ, a consent-aware AI CRM analyst for WhatsApp sales conversations and understand every language in the world.

You are the only primary analysis engine. Read the entire WhatsApp chat history yourself like a senior sales analyst. Infer the customer's current state from the full conversation timeline, not from keyword matching. Understand short informal messages, Indonesian slang, mixed language, missing punctuation, and context from previous sales/customer turns.

Do not copy a rule result. Do not assume another engine already scored the lead. Your output must be your own analysis of the chat history and contact metadata.

Your reasoning task:
- Reconstruct the conversation timeline.
- Identify what the customer wanted, what the sales side offered, and what changed over time.
- Pay most attention to the latest meaningful customer state, but do not ignore earlier context.
- Decide whether the customer is only asking, negotiating, waiting, has paid, has opted out, or has already completed the deal.
- Choose exactly one lead status from the allowed statuses based on semantic context.
- Produce scores and recommendations that match your chosen status.
- Decide the follow-up task yourself from the chat timeline. Do not rely on keyword rules or a fixed local schedule.
- If a follow-up is needed, set followUpTask.shouldCreate true and provide a concrete dueAtIso after currentTimeIso.
- If the best action is to wait for the customer, stop contacting, deal is won/lost, or no useful follow-up exists, set followUpTask.shouldCreate false and dueAtIso null.

Score each metric from 0 to 100:
- interestScore: customer curiosity, product fit questions, repeated engagement.
- buyingIntentScore: concrete buying intent such as order, invoice, payment, address, PO, delivery.
- urgencyScore: time pressure, today/tomorrow/now language, delivery deadline.
- budgetFitScore: whether pricing seems acceptable or blocked by budget concerns.
- productMatchScore: how clearly the customer need matches the offered product/service.
- sentimentScore: positive/neutral/negative tone and trust.
- replyPriorityScore: how important it is for a human to respond soon.
- spamRiskScore: risk of unwanted contact, opt-out, too many sales messages without reply, or cooldown concerns.

Rules:
- You are not a spam tool.
- Do not recommend aggressive messaging.
- Do not auto-send messages.
- Respect opt-out and negative intent.
- If the customer asks not to be contacted, set status DO_NOT_CONTACT_YET.
- If the last message is from sales and the customer has not replied, consider WAITING_CUSTOMER or DO_NOT_CONTACT_YET.
- Suggested replies must be polite, short, and natural.
- Do not hallucinate products, prices, locations, or promises not found in the chat.
- If uncertain, say uncertain.
- Return only one valid JSON object that exactly matches the required output template.
- Do not return prose, markdown, explanation, or stringified nested objects.
- Use the same language as the customer when possible.`;

const outputTemplate = {
  leadStatus: "HOT_NOW | FOLLOW_UP_TODAY | FOLLOW_UP_TOMORROW | NURTURE | PRICE_OBJECTION | WAITING_CUSTOMER | DO_NOT_CONTACT_YET | COLD | WON | LOST",
  overallScore: 0,
  scores: {
    interestScore: 0,
    buyingIntentScore: 0,
    urgencyScore: 0,
    budgetFitScore: 0,
    productMatchScore: 0,
    sentimentScore: 0,
    replyPriorityScore: 0,
    spamRiskScore: 0
  },
  detected: {
    products: [],
    prices: [],
    locations: [],
    quantities: [],
    timeSignals: [],
    objections: [],
    buyingSignals: [],
    negativeSignals: [],
    optOutSignals: [],
    decisionMakers: []
  },
  decisionStage: "string",
  recommendation: {
    nextBestAction: "string",
    followUpTiming: "now | today | tomorrow | three_days | wait_customer_reply | do_not_contact | no_follow_up",
    reason: "string",
    doNotContactReason: null,
    suggestedReply: "string"
  },
  followUpTask: {
    shouldCreate: false,
    title: "string",
    description: "string",
    dueAtIso: null,
    priority: "high | medium | low | none",
    humanApprovalRequired: true,
    reason: "string"
  },
  summary: {
    shortSummary: "string",
    customerNeed: "string",
    salesOpportunity: "string",
    risk: "string"
  }
};

export function hashAnalysisInput(messages: AnalyzerMessage[], context?: AiAnalyzerContext) {
  return crypto.createHash("sha256").update(JSON.stringify({ messages, context })).digest("hex");
}

export function buildAiAnalysisInput(messages: AnalyzerMessage[], context: AiAnalyzerContext) {
  return {
    product: "ChatLeadIQ",
    instruction:
      "Analyze this authorized WhatsApp sales chat history directly. Produce lead status, scores, detected entities/signals, recommendation, summary, and one suggested reply draft. Do not auto-send.",
    allowedLeadStatuses: [
      "HOT_NOW",
      "FOLLOW_UP_TODAY",
      "FOLLOW_UP_TOMORROW",
      "NURTURE",
      "PRICE_OBJECTION",
      "WAITING_CUSTOMER",
      "DO_NOT_CONTACT_YET",
      "COLD",
      "WON",
      "LOST"
    ],
    leadStatusDefinitions: {
      HOT_NOW: "Customer has strong immediate buying intent but the deal is not completed yet. Examples include asking for invoice/payment details, delivery, address, PO, or urgent purchase next steps.",
      FOLLOW_UP_TODAY: "Customer is interested and should be followed up today, but has not committed or paid.",
      FOLLOW_UP_TOMORROW: "Customer likely needs time, approval, or a light follow-up tomorrow.",
      NURTURE: "Customer is exploring or early-stage and needs education or low-pressure nurturing.",
      PRICE_OBJECTION: "Customer is blocked or negotiating mainly on price/value.",
      WAITING_CUSTOMER: "Sales has replied or asked something and the next meaningful action belongs to the customer.",
      DO_NOT_CONTACT_YET: "Customer opted out, showed negative intent, or contact would be spammy/unsafe.",
      COLD: "No meaningful buying signal or useful context exists yet.",
      WON: "The customer has completed or clearly confirmed the transaction/deal, such as paid, sent money/proof, confirmed purchase completion, or sales is processing the order after agreement.",
      LOST: "The customer clearly cancelled, rejected, bought elsewhere, or the opportunity is over."
    },
    scoreRubric: {
      interestScore: "0 no meaningful interest, 100 strong repeated product interest",
      buyingIntentScore: "0 no purchase intent, 100 order/payment/invoice/address/PO intent",
      urgencyScore: "0 no timeline, 100 immediate deadline",
      budgetFitScore: "0 budget impossible or rejected, 100 budget appears accepted",
      productMatchScore: "0 unclear fit, 100 explicit match to need",
      sentimentScore: "0 strongly negative, 100 strongly positive",
      replyPriorityScore: "0 no reply needed, 100 human should respond now",
      spamRiskScore: "0 safe to continue with care, 100 do not contact or high spam risk"
    },
    safetyRules: {
      noAutoSend: true,
      humanApprovalRequired: true,
      respectOptOut: true,
      avoidAggressiveFollowup: true,
      ifLastMessageFromSales: "Prefer WAITING_CUSTOMER unless there is a clear agreed follow-up date.",
      ifOptOutDetected: "Set DO_NOT_CONTACT_YET, spamRiskScore high, suggestedReply empty, and followUpTask.shouldCreate false."
    },
    followUpTaskRules: {
      source: "The AI must infer follow-up need and timing from the conversation semantics, not from local keyword parameters.",
      currentTimeIso: new Date().toISOString(),
      dueAtIso: "Use an ISO-8601 datetime after currentTimeIso when shouldCreate is true. Use null when no follow-up should be created.",
      humanApprovalRequired: "Always true. A task can remind a human, but the AI must not send messages automatically.",
      avoidTasksWhen: [
        "customer opted out",
        "deal is already won and no relationship-maintenance action is useful",
        "lead is lost",
        "last meaningful action belongs to the customer",
        "no meaningful context exists"
      ]
    },
    outputTemplate,
    context,
    chatHistory: messages.map((message, index) => ({
      order: index + 1,
      from: message.isFromMe ? "sales" : "customer",
      senderName: message.senderName ?? null,
      text: message.text,
      timestamp: message.timestamp.toISOString()
    })),
    outputContract: {
      format: "Return exactly one JSON object. Every nested field in outputTemplate is required. Arrays must be arrays. recommendation and summary must be objects, not strings. Scores must be numbers from 0 to 100.",
      template: outputTemplate
    }
  };
}

export async function analyzeWithAI(messages: AnalyzerMessage[], context: AiAnalyzerContext) {
  if (!env.ENABLE_AI_ANALYZER) {
    throw new Error("AI analyzer is disabled");
  }
  if (!hasConfiguredProvider()) {
    throw new Error("AI analyzer requires OPENAI_API_KEY or GEMINI_API_KEY");
  }

  try {
    const input = buildAiAnalysisInput(messages, context);
    const content = await callConfiguredProvider(input);
    const parsed = await parseOrRepairAiResult(content, input);
    return { engine: "AI_ASSISTED" as const, result: enforceSafetyGuardrails(parsed, messages, context) };
  } catch (error) {
    logger.warn({ error }, "AI analyzer failed");
    throw error;
  }
}

async function parseOrRepairAiResult(content: string, originalInput: unknown) {
  const first = parseAiResult(content);
  if (first.ok) return first.data;

  logger.warn({ issues: first.issues }, "AI analyzer returned invalid JSON shape, requesting repair");
  const repairedContent = await callConfiguredProvider({
    task: "Repair your previous ChatLeadIQ analyzer output. Return only one valid JSON object matching the required template. Do not change the analysis unless needed to satisfy the schema.",
    validationIssues: first.issues,
    invalidOutput: content.slice(0, 8000),
    requiredOutputTemplate: outputTemplate,
    originalInput
  });
  const repaired = parseAiResult(repairedContent);
  if (repaired.ok) return repaired.data;

  throw new Error(`AI analyzer returned invalid JSON after repair: ${JSON.stringify(repaired.issues)}`);
}

function parseAiResult(content: string): { ok: true; data: LeadAnalysisResult } | { ok: false; issues: unknown } {
  try {
    const parsedJson = JSON.parse(extractJsonObject(content));
    const parsed = leadAnalysisSchema.safeParse(parsedJson);
    if (parsed.success) return { ok: true, data: parsed.data };
    return { ok: false, issues: parsed.error.issues };
  } catch (error) {
    return { ok: false, issues: error instanceof Error ? error.message : String(error) };
  }
}

function extractJsonObject(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function hasConfiguredProvider() {
  if (env.AI_PROVIDER === "openai") return Boolean(env.OPENAI_API_KEY);
  if (env.AI_PROVIDER === "gemini") return Boolean(env.GEMINI_API_KEY);
  return Boolean(env.OPENAI_API_KEY || env.GEMINI_API_KEY);
}

async function callConfiguredProvider(input: unknown) {
  if (env.AI_PROVIDER === "openai") return callOpenAI(input);
  if (env.AI_PROVIDER === "gemini") return callGemini(input);
  return env.OPENAI_API_KEY ? callOpenAI(input) : callGemini(input);
}

async function callOpenAI(input: unknown) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CHATLEADIQ_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(input) }
      ]
    })
  });

  if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  return content;
}

async function callGemini(input: unknown) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `${CHATLEADIQ_SYSTEM_PROMPT}\n\nReturn valid JSON for this input:\n${JSON.stringify(input)}` }]
          }
        ]
      })
    }
  );

  if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
  const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Gemini returned empty content");
  return content;
}

function enforceSafetyGuardrails(result: LeadAnalysisResult, messages: AnalyzerMessage[], context: AiAnalyzerContext): LeadAnalysisResult {
  const customerText = messages
    .filter((message) => !message.isFromMe)
    .map((message) => message.text.toLowerCase())
    .join("\n");
  const optOutDetected =
    context.contact.doNotContact ||
    context.contact.consentStatus === "OPTED_OUT" ||
    ["jangan hubungi", "jangan chat", "stop", "unsubscribe", "tidak usah", "tidak minat"].some((signal) => customerText.includes(signal));

  if (!optOutDetected) return result;

  return {
    ...result,
    leadStatus: "DO_NOT_CONTACT_YET",
    overallScore: Math.min(result.overallScore, 10),
    scores: {
      ...result.scores,
      replyPriorityScore: 0,
      spamRiskScore: 100
    },
    detected: {
      ...result.detected,
      optOutSignals: result.detected.optOutSignals.length ? result.detected.optOutSignals : ["opt-out detected"],
      negativeSignals: Array.from(new Set([...result.detected.negativeSignals, "do not contact"]))
    },
    recommendation: {
      ...result.recommendation,
      nextBestAction: "jangan chat dulu",
      followUpTiming: "do_not_contact",
      doNotContactReason: result.recommendation.doNotContactReason ?? "Customer opted out or asked not to be contacted.",
      suggestedReply: ""
    },
    followUpTask: {
      shouldCreate: false,
      title: "",
      description: "",
      dueAtIso: null,
      priority: "none",
      humanApprovalRequired: true,
      reason: "Do-not-contact guardrail prevents follow-up task creation."
    },
    summary: {
      ...result.summary,
      risk: "Do-not-contact guardrail applied because opt-out intent was detected."
    }
  };
}
