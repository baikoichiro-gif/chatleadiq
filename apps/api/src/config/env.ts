import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const envPaths = [
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "apps/api/.env")
];

for (const envPath of Array.from(new Set(envPaths))) {
  dotenv.config({ path: envPath, override: true });
}

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  APP_URL: z.string().default("http://localhost:3000"),
  API_PORT: z.coerce.number().default(4000),
  API_URL: z.string().default("http://localhost:4000"),
  DATABASE_URL: z.string().min(1),
  ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  ADMIN_PASSWORD: z.string().default("change-this-password"),
  JWT_SECRET: z.string().default("change-this-secret"),
  OPENAI_API_KEY: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  ENABLE_AI_ANALYZER: z.coerce.boolean().default(true),
  AI_ANALYZER_REQUIRED: z.coerce.boolean().default(true),
  AI_PROVIDER: z.enum(["openai", "gemini", "auto"]).default("auto"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
  BAILEYS_AUTH_DIR: z.string().default("./data/baileys-auth"),
  BAILEYS_BROWSER: z.enum(["ubuntu", "windows", "macos", "baileys"]).default("ubuntu"),
  ANALYSIS_DEBOUNCE_MS: z.coerce.number().default(10_000),
  ANALYSIS_BACKFILL_BATCH_SIZE: z.coerce.number().default(50),
  MAX_HISTORY_MESSAGES_PER_CHAT: z.coerce.number().default(100),
  ONLY_ANALYZE_RECENT_CHATS: z.coerce.boolean().default(true),
  ENABLE_AUTO_SEND: z.coerce.boolean().default(false),
  FOLLOWUP_COOLDOWN_HOURS: z.coerce.number().default(24),
  MASK_PHONE_IN_LOGS: z.coerce.boolean().default(true)
});

export const env = schema.parse(process.env);
