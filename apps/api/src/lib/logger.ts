import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: ["req.headers.authorization", "password", "passwordHash", "*.sessionPath"]
});

export function maskPhone(value?: string | null) {
  if (!value || !env.MASK_PHONE_IN_LOGS) return value ?? null;
  return value.replace(/(\d{3})\d+(\d{2})/, "$1****$2");
}
