import type { Server } from "socket.io";
import { prisma } from "../../lib/prisma.js";
import { stringifyJsonField } from "../../lib/jsonField.js";
import { analysisQueue } from "../analyzer/analysisQueue.js";

type BaileysMessage = {
  key?: {
    id?: string;
    remoteJid?: string;
    fromMe?: boolean;
    participant?: string;
  };
  message?: Record<string, unknown>;
  pushName?: string;
  messageTimestamp?: number | LongLike;
};

type LongLike = {
  toNumber?: () => number;
};

function timestampToDate(value: BaileysMessage["messageTimestamp"]) {
  if (!value) return new Date();
  if (typeof value === "number") return new Date(value * 1000);
  if (typeof value.toNumber === "function") return new Date(value.toNumber() * 1000);
  return new Date();
}

function extractText(message?: Record<string, unknown>): { text: string; messageType: string } {
  if (!message) return { text: "", messageType: "unknown" };
  const type = Object.keys(message)[0] ?? "unknown";
  const value = message[type] as Record<string, unknown> | string | undefined;
  if (typeof value === "string") return { text: value, messageType: type };
  const text =
    (value?.conversation as string | undefined) ??
    (value?.caption as string | undefined) ??
    ((value?.extendedTextMessage as Record<string, unknown> | undefined)?.text as string | undefined) ??
    "";
  return { text, messageType: type };
}

function normalizePhone(waJid: string) {
  return waJid.split("@")[0]?.replace(/\D/g, "") ?? null;
}

type SaveMessageOptions = {
  countUnread?: boolean;
  emitMessageEvent?: boolean;
  enqueueAnalysis?: boolean;
  analysisReason?: string;
};

export async function saveBaileysMessage(rawMessage: BaileysMessage, io?: Server, options: SaveMessageOptions = {}) {
  const remoteJid = rawMessage.key?.remoteJid;
  const waMessageId = rawMessage.key?.id;
  if (!remoteJid || !waMessageId || remoteJid === "status@broadcast") return null;

  const { text, messageType } = extractText(rawMessage.message);
  const isFromMe = Boolean(rawMessage.key?.fromMe);
  const timestamp = timestampToDate(rawMessage.messageTimestamp);

  const contact = await prisma.contact.upsert({
    where: { waJid: remoteJid },
    update: {
      pushName: rawMessage.pushName ?? undefined,
      phone: normalizePhone(remoteJid) ?? undefined
    },
    create: {
      waJid: remoteJid,
      pushName: rawMessage.pushName,
      phone: normalizePhone(remoteJid),
      tagsJson: "[]"
    }
  });

  const chat = await prisma.chat.upsert({
    where: { waChatId: remoteJid },
    update: {
      contactId: contact.id,
      lastMessageAt: timestamp,
      unreadCount: isFromMe || options.countUnread === false ? undefined : { increment: 1 }
    },
    create: {
      waChatId: remoteJid,
      contactId: contact.id,
      name: rawMessage.pushName,
      lastMessageAt: timestamp,
      unreadCount: isFromMe ? 0 : 1
    }
  });

  const saved = await prisma.message.upsert({
    where: { waMessageId },
    update: {},
    create: {
      waMessageId,
      chatId: chat.id,
      contactId: contact.id,
      direction: isFromMe ? "OUTBOUND" : "INBOUND",
      senderName: rawMessage.pushName,
      text,
      messageType,
      timestamp,
      isFromMe,
      rawJson: stringifyJsonField(rawMessage)
    }
  });

  if (options.emitMessageEvent !== false) {
    io?.emit("message:new", { chatId: chat.id, messageId: saved.id });
  }
  if (options.enqueueAnalysis !== false) {
    analysisQueue.enqueueChat(chat.id, { reason: options.analysisReason ?? "message_received" });
  }

  return saved;
}

export async function saveBaileysMessages(rawMessages: BaileysMessage[], io?: Server, options: SaveMessageOptions = {}) {
  const chatIds = new Set<number>();
  let savedMessages = 0;

  for (const rawMessage of rawMessages) {
    const saved = await saveBaileysMessage(rawMessage, io, {
      ...options,
      countUnread: options.countUnread ?? false,
      emitMessageEvent: options.emitMessageEvent ?? false,
      enqueueAnalysis: false
    });
    if (saved) {
      savedMessages += 1;
      chatIds.add(saved.chatId);
    }
  }

  for (const chatId of chatIds) {
    if (options.enqueueAnalysis !== false) {
      analysisQueue.enqueueChat(chatId, { reason: options.analysisReason ?? "history_sync" });
    }
  }

  return { savedMessages, chatIds: Array.from(chatIds) };
}
