import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

export const followupsRouter = Router();

const taskInclude = {
  lead: {
    include: {
      contact: true,
      chat: true,
      suggestedReplies: { orderBy: { createdAt: "desc" as const }, take: 1 },
      analyses: { orderBy: { createdAt: "desc" as const }, take: 1 }
    }
  }
};

followupsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const tasks = await prisma.followUpTask.findMany({
      where: { status: "PENDING" },
      include: taskInclude,
      orderBy: { dueAt: "asc" },
      take: 200
    });

    res.json({
      generatedBy: "AI_ANALYZER",
      note: "Follow-up tasks are created from the AI analyzer followUpTask output and remain human-approved only.",
      tasks,
      buckets: bucketTasks(tasks)
    });
  })
);

followupsRouter.get("/today", asyncHandler(async (_req, res) => res.json({ tasks: await findTasks("today") })));
followupsRouter.get("/overdue", asyncHandler(async (_req, res) => res.json({ tasks: await findTasks("overdue") })));
followupsRouter.get("/tomorrow", asyncHandler(async (_req, res) => res.json({ tasks: await findTasks("tomorrow") })));
followupsRouter.get("/upcoming", asyncHandler(async (_req, res) => res.json({ tasks: await findTasks("upcoming") })));

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

async function findTasks(type: "today" | "overdue" | "tomorrow" | "upcoming") {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfTomorrow = new Date(endOfToday.getTime() + 1);
  const endOfTomorrow = new Date(startOfTomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);

  return prisma.followUpTask.findMany({
    where: {
      status: "PENDING",
      dueAt:
        type === "overdue"
          ? { lt: now }
          : type === "tomorrow"
            ? { gte: startOfTomorrow, lte: endOfTomorrow }
            : type === "upcoming"
              ? { gt: endOfTomorrow }
              : { gte: startOfToday, lte: endOfToday }
    },
    include: taskInclude,
    orderBy: { dueAt: "asc" }
  });
}

function bucketTasks<T extends { dueAt: Date }>(tasks: T[]) {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfTomorrow = new Date(endOfToday.getTime() + 1);
  const endOfTomorrow = new Date(startOfTomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);

  return {
    overdue: tasks.filter((task) => task.dueAt < now),
    today: tasks.filter((task) => task.dueAt >= now && task.dueAt <= endOfToday),
    tomorrow: tasks.filter((task) => task.dueAt >= startOfTomorrow && task.dueAt <= endOfTomorrow),
    upcoming: tasks.filter((task) => task.dueAt > endOfTomorrow)
  };
}
