import { Router } from "express";
import { z } from "zod";
import { asyncHandler, HttpError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { auditLog } from "../services/audit.js";

export const leadsRouter = Router();

leadsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        status: z.string().optional(),
        search: z.string().optional(),
        minScore: z.coerce.number().optional()
      })
      .parse(req.query);
    const leads = await prisma.lead.findMany({
      where: {
        status: query.status as never,
        overallScore: query.minScore ? { gte: query.minScore } : undefined,
        OR: query.search
          ? [{ contact: { pushName: { contains: query.search } } }, { contact: { phone: { contains: query.search } } }, { summary: { contains: query.search } }]
          : undefined
      },
      include: { contact: true, chat: true, followUpTasks: { orderBy: { dueAt: "asc" }, take: 1 } },
      orderBy: [{ spamRiskScore: "asc" }, { overallScore: "desc" }],
      take: 200
    });
    res.json({ leads });
  })
);

leadsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        contact: true,
        chat: { include: { messages: { orderBy: { timestamp: "asc" }, take: 200 } } },
        analyses: { orderBy: { createdAt: "desc" }, take: 10 },
        suggestedReplies: { orderBy: { createdAt: "desc" }, take: 10 },
        followUpTasks: { orderBy: { dueAt: "asc" }, take: 10 }
      }
    });
    if (!lead) throw new HttpError(404, "Lead not found");
    const auditLogs = await prisma.auditLog.findMany({ where: { entityType: "Lead", entityId: lead.id }, orderBy: { createdAt: "desc" }, take: 20 });
    res.json({ lead, auditLogs });
  })
);

leadsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        status: z.string().optional(),
        followUpAt: z.string().datetime().optional().nullable(),
        nextBestAction: z.string().optional()
      })
      .parse(req.body);
    const lead = await prisma.lead.update({
      where: { id: Number(req.params.id) },
      data: {
        status: body.status as never,
        followUpAt: body.followUpAt ? new Date(body.followUpAt) : body.followUpAt,
        nextBestAction: body.nextBestAction
      }
    });
    await auditLog("LEAD_UPDATED", "Lead", lead.id, body);
    res.json({ lead });
  })
);

leadsRouter.post(
  "/:id/mark-won",
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.update({ where: { id: Number(req.params.id) }, data: { status: "WON" } });
    await auditLog("LEAD_MARKED_WON", "Lead", lead.id);
    res.json({ lead });
  })
);
leadsRouter.post(
  "/:id/mark-lost",
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.update({ where: { id: Number(req.params.id) }, data: { status: "LOST" } });
    await auditLog("LEAD_MARKED_LOST", "Lead", lead.id);
    res.json({ lead });
  })
);

leadsRouter.post(
  "/:id/do-not-contact",
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.update({
      where: { id: Number(req.params.id) },
      data: { status: "DO_NOT_CONTACT_YET", spamRiskScore: 100, contact: { update: { doNotContact: true, consentStatus: "OPTED_OUT" } } }
    });
    await auditLog("DO_NOT_CONTACT_SET", "Lead", lead.id);
    res.json({ lead });
  })
);

leadsRouter.post(
  "/:id/follow-up",
  asyncHandler(async (req, res) => {
    const body = z.object({ title: z.string(), description: z.string().optional(), dueAt: z.string().datetime() }).parse(req.body);
    const task = await prisma.followUpTask.create({
      data: {
        leadId: Number(req.params.id),
        title: body.title,
        description: body.description,
        dueAt: new Date(body.dueAt)
      }
    });
    await auditLog("FOLLOW_UP_CREATED", "Lead", Number(req.params.id), body);
    res.json({ task });
  })
);
