import type { LeadStatus } from "@prisma/client";
import { env } from "../../config/env.js";
import { stringifyJsonField } from "../../lib/jsonField.js";
import { prisma } from "../../lib/prisma.js";
import { auditLog } from "../audit.js";
import { analyzeWithAI, hashAnalysisInput, type AiAnalyzerContext } from "./aiAnalyzer.js";
import { analyzeWithRules } from "./ruleAnalyzer.js";
import type { AnalyzerMessage } from "./types.js";

export async function analyzeChat(chatId: number) {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { contact: true }
  });
  if (!chat) throw new Error("Chat not found");

  const rawMessages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { timestamp: "desc" },
    take: env.MAX_HISTORY_MESSAGES_PER_CHAT
  });

  const messages: AnalyzerMessage[] = rawMessages
    .reverse()
    .map((message) => ({
      text: message.text,
      isFromMe: message.isFromMe,
      timestamp: message.timestamp,
      senderName: message.senderName
    }));

  const previousLead = await prisma.lead.findUnique({ where: { chatId } });
  const aiContext: AiAnalyzerContext = {
    contact: {
      waJid: chat.contact.waJid,
      name: chat.contact.name,
      pushName: chat.contact.pushName,
      phone: chat.contact.phone,
      consentStatus: chat.contact.consentStatus,
      doNotContact: chat.contact.doNotContact
    },
    previousLead: previousLead
      ? {
          status: previousLead.status,
          overallScore: previousLead.overallScore,
          decisionStage: previousLead.decisionStage,
          followUpTiming: previousLead.followUpTiming,
          summary: previousLead.summary
        }
      : null,
    maxHistoryMessages: env.MAX_HISTORY_MESSAGES_PER_CHAT
  };

  const aiResult = await analyzeWithAI(messages, aiContext).catch((error) => {
    if (env.AI_ANALYZER_REQUIRED) throw error;
    const fallback = analyzeWithRules(messages, chat.contact.consentStatus);
    return { engine: "RULE_BASED" as const, result: fallback };
  });
  const result = aiResult.result;
  const followUpAt = buildFollowUpDate(result.recommendation.followUpTiming);

  const lead = await prisma.lead.upsert({
    where: { chatId },
    update: {
      status: result.leadStatus as LeadStatus,
      overallScore: result.overallScore,
      interestScore: result.scores.interestScore,
      buyingIntentScore: result.scores.buyingIntentScore,
      urgencyScore: result.scores.urgencyScore,
      budgetFitScore: result.scores.budgetFitScore,
      productMatchScore: result.scores.productMatchScore,
      sentimentScore: result.scores.sentimentScore,
      replyPriorityScore: result.scores.replyPriorityScore,
      spamRiskScore: result.scores.spamRiskScore,
      decisionStage: result.decisionStage,
      productInterestJson: stringifyJsonField(result.detected.products),
      objectionsJson: stringifyJsonField(result.detected.objections),
      nextBestAction: result.recommendation.nextBestAction,
      followUpTiming: result.recommendation.followUpTiming,
      followUpAt,
      summary: stringifyJsonField(result.summary),
      lastAnalyzedAt: new Date()
    },
    create: {
      contactId: chat.contactId,
      chatId,
      status: result.leadStatus as LeadStatus,
      overallScore: result.overallScore,
      interestScore: result.scores.interestScore,
      buyingIntentScore: result.scores.buyingIntentScore,
      urgencyScore: result.scores.urgencyScore,
      budgetFitScore: result.scores.budgetFitScore,
      productMatchScore: result.scores.productMatchScore,
      sentimentScore: result.scores.sentimentScore,
      replyPriorityScore: result.scores.replyPriorityScore,
      spamRiskScore: result.scores.spamRiskScore,
      decisionStage: result.decisionStage,
      productInterestJson: stringifyJsonField(result.detected.products),
      objectionsJson: stringifyJsonField(result.detected.objections),
      nextBestAction: result.recommendation.nextBestAction,
      followUpTiming: result.recommendation.followUpTiming,
      followUpAt,
      summary: stringifyJsonField(result.summary),
      lastAnalyzedAt: new Date()
    }
  });

  await prisma.analysisResult.create({
    data: {
      leadId: lead.id,
      chatId,
      engine: aiResult.engine,
      inputHash: hashAnalysisInput(messages, aiContext),
      resultJson: stringifyJsonField(result)
    }
  });

  if (result.recommendation.suggestedReply) {
    const latestDraft = await prisma.suggestedReply.findFirst({
      where: { leadId: lead.id, status: "DRAFT" },
      orderBy: { createdAt: "desc" }
    });
    if (latestDraft) {
      await prisma.suggestedReply.update({
        where: { id: latestDraft.id },
        data: { text: result.recommendation.suggestedReply }
      });
    } else {
      await prisma.suggestedReply.create({
        data: {
          leadId: lead.id,
          text: result.recommendation.suggestedReply,
          status: "DRAFT"
        }
      });
    }
  }

  if (followUpAt && result.leadStatus !== "DO_NOT_CONTACT_YET") {
    const pendingFollowUp = await prisma.followUpTask.findFirst({
      where: { leadId: lead.id, status: "PENDING" },
      orderBy: { dueAt: "asc" }
    });
    const followUpData = {
      title: result.recommendation.nextBestAction || "Follow up lead",
      description: result.recommendation.reason,
      dueAt: followUpAt
    };
    if (pendingFollowUp) {
      await prisma.followUpTask.update({
        where: { id: pendingFollowUp.id },
        data: followUpData
      });
    } else {
      await prisma.followUpTask.create({
        data: {
          leadId: lead.id,
          ...followUpData
        }
      });
    }
  }

  await auditLog("LEAD_ANALYZED", "Lead", lead.id, { chatId, engine: aiResult.engine, status: result.leadStatus });
  return { lead, result, engine: aiResult.engine };
}

function buildFollowUpDate(timing: string) {
  const now = new Date();
  if (["now", "today"].includes(timing)) return now;
  if (timing === "tomorrow") return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (timing === "three_days") return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  return null;
}
