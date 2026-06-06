import { z } from "zod";
import { leadStatuses } from "./types.js";

const score = z.number().min(0).max(100);

export const leadAnalysisSchema = z.object({
  leadStatus: z.enum(leadStatuses),
  overallScore: score,
  scores: z.object({
    interestScore: score,
    buyingIntentScore: score,
    urgencyScore: score,
    budgetFitScore: score,
    productMatchScore: score,
    sentimentScore: score,
    replyPriorityScore: score,
    spamRiskScore: score
  }),
  detected: z.object({
    products: z.array(z.string()),
    prices: z.array(z.string()),
    locations: z.array(z.string()),
    quantities: z.array(z.string()),
    timeSignals: z.array(z.string()),
    objections: z.array(z.string()),
    buyingSignals: z.array(z.string()),
    negativeSignals: z.array(z.string()),
    optOutSignals: z.array(z.string()),
    decisionMakers: z.array(z.string())
  }),
  decisionStage: z.string(),
  recommendation: z.object({
    nextBestAction: z.string(),
    followUpTiming: z.string(),
    reason: z.string(),
    doNotContactReason: z.string().nullable(),
    suggestedReply: z.string()
  }),
  summary: z.object({
    shortSummary: z.string(),
    customerNeed: z.string(),
    salesOpportunity: z.string(),
    risk: z.string()
  })
});
