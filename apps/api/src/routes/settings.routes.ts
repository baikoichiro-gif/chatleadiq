import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { stringifyJsonField } from "../lib/jsonField.js";

export const settingsRouter = Router();

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.userSetting.findMany({ orderBy: { key: "asc" } });
    res.json({ settings });
  })
);

settingsRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const entries = Object.entries(req.body as Record<string, unknown>);
    await Promise.all(
      entries.map(([key, value]) =>
        prisma.userSetting.upsert({
          where: { key },
          update: { value: typeof value === "string" ? value : stringifyJsonField(value) },
          create: { key, value: typeof value === "string" ? value : stringifyJsonField(value) }
        })
      )
    );
    res.json({ ok: true });
  })
);
