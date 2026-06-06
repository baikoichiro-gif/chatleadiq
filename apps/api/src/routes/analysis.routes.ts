import { Router } from "express";
import { z } from "zod";
import { asyncHandler, HttpError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { analysisQueue } from "../services/analyzer/analysisQueue.js";
import { analyzeChat } from "../services/analyzer/analyzerService.js";

export const analysisRouter = Router();

analysisRouter.post(
  "/run",
  asyncHandler(async (req, res) => {
    const body = z.object({ chatId: z.coerce.number() }).parse(req.body);
    res.json(await analyzeChat(body.chatId));
  })
);

analysisRouter.post(
  "/backfill",
  asyncHandler(async (req, res) => {
    const body = z.object({ limit: z.coerce.number().positive().max(500).optional() }).parse(req.body ?? {});
    res.json(await analysisQueue.backfillChats({ limit: body.limit, reason: "manual_analysis_backfill" }));
  })
);

analysisRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const analysis = await prisma.analysisResult.findUnique({ where: { id: Number(req.params.id) } });
    if (!analysis) throw new HttpError(404, "Analysis not found");
    res.json({ analysis });
  })
);
