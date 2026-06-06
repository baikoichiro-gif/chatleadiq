import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

export const exportRouter = Router();

exportRouter.get(
  "/leads.json",
  asyncHandler(async (_req, res) => {
    const leads = await prisma.lead.findMany({ include: { contact: true, chat: true } });
    res.json({ warning: "Export contains CRM and chat-derived data. Store backups securely.", leads });
  })
);

exportRouter.get(
  "/analysis.json",
  asyncHandler(async (_req, res) => {
    const analysis = await prisma.analysisResult.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });
    res.json({ warning: "Export contains analysis metadata. Review privacy obligations before sharing.", analysis });
  })
);

exportRouter.get(
  "/leads.csv",
  asyncHandler(async (_req, res) => {
    const leads = await prisma.lead.findMany({ include: { contact: true } });
    const rows = [["id", "name", "phone", "status", "overallScore", "followUpAt"]];
    for (const lead of leads) {
      rows.push([
        String(lead.id),
        lead.contact.pushName ?? lead.contact.name ?? "",
        lead.contact.phone ?? "",
        lead.status,
        String(lead.overallScore),
        lead.followUpAt?.toISOString() ?? ""
      ]);
    }
    res.header("content-type", "text/csv");
    res.send(rows.map((row) => row.map(csvCell).join(",")).join("\n"));
  })
);

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
