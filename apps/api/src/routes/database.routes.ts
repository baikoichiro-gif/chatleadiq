import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

export const databaseRouter = Router();

databaseRouter.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const started = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "connected", latencyMs: Date.now() - started, provider: "mysql" });
    } catch (error) {
      res.status(503).json({
        status: "error",
        provider: "mysql",
        message: error instanceof Error ? error.message : "Unable to connect to MySQL"
      });
    }
  })
);
