import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

export const followupsRouter = Router();

followupsRouter.get("/today", asyncHandler(async (_req, res) => res.json({ tasks: await findTasks("today") })));
followupsRouter.get("/overdue", asyncHandler(async (_req, res) => res.json({ tasks: await findTasks("overdue") })));

followupsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = z.object({ status: z.enum(["PENDING", "DONE", "CANCELLED", "OVERDUE"]) }).parse(req.body);
    const task = await prisma.followUpTask.update({
      where: { id: Number(req.params.id) },
      data: { status: body.status, completedAt: body.status === "DONE" ? new Date() : null }
    });
    res.json({ task });
  })
);

async function findTasks(type: "today" | "overdue") {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  return prisma.followUpTask.findMany({
    where: {
      status: "PENDING",
      dueAt: type === "overdue" ? { lt: now } : { gte: now, lte: endOfToday }
    },
    include: { lead: { include: { contact: true, chat: true } } },
    orderBy: { dueAt: "asc" }
  });
}
