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

You are the primary analysis engine. Read the WhatsApp chat history yourself, infer customer intent from context, score every metric, detect products/prices/objections/signals, choose lead status, recommend follow-up timing, summarize the opportunity, and draft a human-approved reply.

Do not copy a rule result. Do not assume another engine already scored the lead. Your output must be your own analysis of the chat history and contact metadata.

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
- Return only valid JSON.
- Use the same language as the customer when possible.`;

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
      ifOptOutDetected: "Set DO_NOT_CONTACT_YET, spamRiskScore high, suggestedReply empty."
    },
    context,
    chatHistory: messages.map((message, index) => ({
      order: index + 1,
      from: message.isFromMe ? "sales" : "customer",
      senderName: message.senderName ?? null,
      text: message.text,
      timestamp: message.timestamp.toISOString()
    })),
    outputContract:
      "Return only JSON matching the LeadAnalysisResult schema. Every score must be 0-100. Suggested reply must be a draft only and require human approval."
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
    const parsed = leadAnalysisSchema.parse(JSON.parse(content));
    return { engine: "AI_ASSISTED" as const, result: enforceSafetyGuardrails(parsed, messages, context) };
  } catch (error) {
    logger.warn({ error }, "AI analyzer failed");
    throw error;
  }
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
    summary: {
      ...result.summary,
      risk: "Do-not-contact guardrail applied because opt-out intent was detected."
    }
  };
}
