import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { whatsAppSessionManager } from "../services/whatsapp/sessionManager.js";

export const whatsappRouter = Router();

whatsappRouter.get("/status", (_req, res) => res.json(whatsAppSessionManager.getStatus()));
whatsappRouter.get("/qr", asyncHandler(async (_req, res) => res.json(await whatsAppSessionManager.getQr())));
whatsappRouter.post("/connect", asyncHandler(async (_req, res) => res.json(await whatsAppSessionManager.connect())));
whatsappRouter.post("/disconnect", asyncHandler(async (_req, res) => res.json(await whatsAppSessionManager.disconnect())));
whatsappRouter.post("/reset-auth", asyncHandler(async (_req, res) => res.json(await whatsAppSessionManager.resetAuth())));
whatsappRouter.post("/resync", asyncHandler(async (_req, res) => res.json(await whatsAppSessionManager.resync())));
