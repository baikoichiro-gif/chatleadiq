import { Router } from "express";
import { z } from "zod";
import { asyncHandler, HttpError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { analyzeChat } from "../services/analyzer/analyzerService.js";

export const chatsRouter = Router();

chatsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        search: z.string().optional(),
        recent: z.coerce.boolean().optional(),
        unread: z.coerce.boolean().optional()
      })
      .parse(req.query);
    const chats = await prisma.chat.findMany({
      where: {
        unreadCount: query.unread ? { gt: 0 } : undefined,
        OR: query.search
          ? [{ name: { contains: query.search } }, { contact: { phone: { contains: query.search } } }, { contact: { pushName: { contains: query.search } } }]
          : undefined
      },
      include: { contact: true, lead: true, messages: { orderBy: { timestamp: "desc" }, take: 1 } },
      orderBy: { lastMessageAt: "desc" },
      take: query.recent ? 50 : 200
    });
    res.json({ chats });
  })
);

chatsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const chat = await prisma.chat.findUnique({
      where: { id: Number(req.params.id) },
      include: { contact: true, lead: { include: { suggestedReplies: { orderBy: { createdAt: "desc" }, take: 5 } } } }
    });
    if (!chat) throw new HttpError(404, "Chat not found");
    res.json({ chat });
  })
);

chatsRouter.get(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    const messages = await prisma.message.findMany({
      where: { chatId: Number(req.params.id) },
      orderBy: { timestamp: "asc" },
      take: 300
    });
    res.json({ messages });
  })
);

chatsRouter.post(
  "/:id/analyze",
  asyncHandler(async (req, res) => {
    res.json(await analyzeChat(Number(req.params.id)));
  })
);

chatsRouter.post("/:id/resync", (_req, res) => {
  res.json({ ok: true, message: "Chat resync requested. New Baileys messages will be captured as they arrive." });
});
