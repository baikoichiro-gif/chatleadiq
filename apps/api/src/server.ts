import http from "node:http";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { HttpError } from "./lib/http.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.routes.js";
import { databaseRouter } from "./routes/database.routes.js";
import { whatsappRouter } from "./routes/whatsapp.routes.js";
import { chatsRouter } from "./routes/chats.routes.js";
import { leadsRouter } from "./routes/leads.routes.js";
import { analysisRouter } from "./routes/analysis.routes.js";
import { followupsRouter } from "./routes/followups.routes.js";
import { settingsRouter } from "./routes/settings.routes.js";
import { exportRouter } from "./routes/export.routes.js";
import { analysisQueue } from "./services/analyzer/analysisQueue.js";
import { whatsAppSessionManager } from "./services/whatsapp/sessionManager.js";

export function createServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: env.APP_URL, credentials: true }
  });
  analysisQueue.attachSocket(io);
  whatsAppSessionManager.attachSocket(io);

  app.use(helmet());
  app.use(cors({ origin: env.APP_URL, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 180,
      standardHeaders: "draft-7",
      legacyHeaders: false
    })
  );

  app.get("/health", (_req, res) =>
    res.json({
      ok: true,
      name: "ChatLeadIQ API",
      mode: env.NODE_ENV,
      safety: { enableAutoSend: env.ENABLE_AUTO_SEND }
    })
  );

  app.use("/api/auth", authRouter);
  app.use("/api/database", databaseRouter);
  app.use("/api/whatsapp", requireAuth, whatsappRouter);
  app.use("/api/chats", requireAuth, chatsRouter);
  app.use("/api/leads", requireAuth, leadsRouter);
  app.use("/api/analysis", requireAuth, analysisRouter);
  app.use("/api/followups", requireAuth, followupsRouter);
  app.use("/api/settings", requireAuth, settingsRouter);
  app.use("/api/export", requireAuth, exportRouter);

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    logger.error({ error }, "Unhandled API error");
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  });

  return { app, server, io };
}
