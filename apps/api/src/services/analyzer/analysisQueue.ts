import type { Server } from "socket.io";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { analyzeChat } from "./analyzerService.js";

type EnqueueOptions = {
  debounceMs?: number;
  reason?: string;
};

type BackfillOptions = {
  limit?: number;
  reason?: string;
};

class AnalysisQueue {
  private io?: Server;
  private timers = new Map<number, NodeJS.Timeout>();
  private running = new Set<number>();

  attachSocket(io: Server) {
    this.io = io;
  }

  enqueueChat(chatId: number, options: EnqueueOptions = {}) {
    const debounceMs = options.debounceMs ?? env.ANALYSIS_DEBOUNCE_MS;
    const reason = options.reason ?? "message_received";
    const existing = this.timers.get(chatId);
    if (existing) clearTimeout(existing);

    this.io?.emit("analysis:queued", { chatId, reason, debounceMs });
    const timer = setTimeout(() => {
      this.timers.delete(chatId);
      this.runChat(chatId, reason).catch((error) => {
        const message = error instanceof Error ? error.message : "Analysis failed";
        logger.warn({ error, chatId, reason }, "Queued analysis failed");
        this.io?.emit("analysis:error", { chatId, message });
      });
    }, debounceMs);

    this.timers.set(chatId, timer);
    return { chatId, queued: true, reason, debounceMs };
  }

  async analyzeNow(chatId: number, reason = "manual") {
    const existing = this.timers.get(chatId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(chatId);
    }
    return this.runChat(chatId, reason);
  }

  async backfillChats(options: BackfillOptions = {}) {
    const limit = options.limit ?? env.ANALYSIS_BACKFILL_BATCH_SIZE;
    const reason = options.reason ?? "backfill";
    const chats = await prisma.chat.findMany({
      where: {
        messages: { some: {} },
        ...(env.ONLY_ANALYZE_RECENT_CHATS ? { lastMessageAt: { not: null } } : {})
      },
      select: { id: true },
      orderBy: { lastMessageAt: "desc" },
      take: limit
    });

    chats.forEach((chat, index) => {
      this.enqueueChat(chat.id, {
        reason,
        debounceMs: Math.min(env.ANALYSIS_DEBOUNCE_MS + index * 250, 15_000)
      });
    });

    this.io?.emit("analysis:backfill-queued", { queuedChats: chats.length, reason });
    return { queuedChats: chats.length, reason };
  }

  private async runChat(chatId: number, reason: string) {
    if (this.running.has(chatId)) {
      return this.enqueueChat(chatId, { reason, debounceMs: env.ANALYSIS_DEBOUNCE_MS });
    }

    this.running.add(chatId);
    this.io?.emit("analysis:started", { chatId, reason });
    try {
      const analysis = await analyzeChat(chatId);
      this.io?.emit("lead:analyzed", {
        chatId,
        leadId: analysis.lead.id,
        engine: analysis.engine,
        status: analysis.lead.status,
        overallScore: analysis.lead.overallScore,
        reason
      });
      return analysis;
    } finally {
      this.running.delete(chatId);
    }
  }
}

export const analysisQueue = new AnalysisQueue();
