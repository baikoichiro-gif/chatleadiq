import path from "node:path";
import fs from "node:fs/promises";
import type { WhatsAppSessionStatus } from "@prisma/client";
import QRCode from "qrcode";
import type { Server } from "socket.io";
import { env } from "../../config/env.js";
import { logger, maskPhone } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { analysisQueue } from "../analyzer/analysisQueue.js";
import { saveBaileysMessage, saveBaileysMessages } from "../sync/messageSync.js";

type WhatsAppRuntimeStatus = {
  status: "DISCONNECTED" | "QR_REQUIRED" | "CONNECTING" | "CONNECTED" | "ERROR";
  phoneNumber: string | null;
  qrCode: string | null;
  lastError: string | null;
};

type WhatsAppSocket = {
  user?: { id?: string };
  ev: {
    on: (event: string, handler: (...args: never[]) => void | Promise<void>) => void;
  };
  logout?: (message?: string) => Promise<void>;
  end?: (error?: Error) => void;
};

export class WhatsAppSessionManager {
  private socket: unknown;
  private io?: Server;
  private runtime: WhatsAppRuntimeStatus = {
    status: "DISCONNECTED",
    phoneNumber: null,
    qrCode: null,
    lastError: null
  };

  attachSocket(io: Server) {
    this.io = io;
  }

  getStatus() {
    return { ...this.runtime, phoneNumber: maskPhone(this.runtime.phoneNumber) };
  }

  async connect() {
    if (this.runtime.status === "CONNECTED" || this.runtime.status === "CONNECTING") return this.getStatus();
    await this.createSocket();
    return this.getStatus();
  }

  async getQr() {
    await this.connect();
    return this.getStatus();
  }

  private async createSocket() {
    if (this.socket) {
      return this.socket as WhatsAppSocket;
    }

    this.runtime = { ...this.runtime, status: "CONNECTING", qrCode: null, lastError: null };
    this.io?.emit("whatsapp:connecting", this.getStatus());

    await fs.mkdir(env.BAILEYS_AUTH_DIR, { recursive: true });
    const baileys = await import("@whiskeysockets/baileys");
    const { state, saveCreds } = await baileys.useMultiFileAuthState(env.BAILEYS_AUTH_DIR);
    const makeWASocket = baileys.makeWASocket as unknown as (options: Record<string, unknown>) => WhatsAppSocket;
    const versionInfo = await baileys.fetchLatestBaileysVersion();
    logger.info({ version: versionInfo.version, isLatest: versionInfo.isLatest }, "Using WhatsApp Web version for QR login");

    const sock = makeWASocket({
      version: versionInfo.version,
      auth: {
        creds: state.creds,
        keys: baileys.makeCacheableSignalKeyStore(state.keys, logger as never)
      },
      logger: logger as never,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      fireInitQueries: false,
      getMessage: async () => undefined,
      markOnlineOnConnect: false,
      printQRInTerminal: false,
      qrTimeout: 60_000,
      shouldSyncHistoryMessage: () => true,
      syncFullHistory: false,
      browser: getBaileysBrowser(baileys.Browsers)
    });

    this.socket = sock;
    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("messages.upsert", async ({ messages, type }: { messages: unknown[]; type?: string }) => {
      for (const message of messages) {
        await saveBaileysMessage(message as never, this.io, {
          analysisReason: type === "notify" ? "whatsapp_realtime_message" : "whatsapp_synced_message",
          countUnread: type === "notify",
          emitMessageEvent: true
        });
      }
    });
    sock.ev.on(
      "messaging-history.set",
      async (history: { messages?: unknown[]; chats?: unknown[]; isLatest?: boolean; progress?: number | null; syncType?: unknown }) => {
        const messages = history.messages ?? [];
        const saved = await saveBaileysMessages(messages as never[], this.io, { analysisReason: "whatsapp_history_sync" });
        this.io?.emit("whatsapp:history-sync", {
          savedMessages: saved.savedMessages,
          touchedChats: saved.chatIds.length,
          isLatest: history.isLatest,
          progress: history.progress,
          syncType: history.syncType
        });
      }
    );

    sock.ev.on(
      "connection.update",
      async (update: {
        connection?: string;
        qr?: string;
        lastDisconnect?: { error?: { data?: unknown; message?: string; output?: { statusCode?: number } } };
      }) => {
      if (update.qr) {
        try {
          const qrCode = await QRCode.toDataURL(update.qr, { margin: 1, width: 320 });
          this.runtime = {
            ...this.runtime,
            status: "QR_REQUIRED",
            qrCode,
            lastError: null
          };
          logger.info("WhatsApp QR code generated");
          this.io?.emit("whatsapp:qr", this.getStatus());
          await this.persistSession("QR_REQUIRED");
        } catch (error) {
          logger.warn({ error }, "Unable to render WhatsApp QR code");
        }
      }

      if (update.connection === "open") {
        const phoneNumber = sock.user?.id?.split(":")[0] ?? null;
        this.runtime = { status: "CONNECTED", phoneNumber, qrCode: null, lastError: null };
        this.io?.emit("whatsapp:connected", this.getStatus());
        await this.persistSession("CONNECTED", phoneNumber);
        logger.info({ phoneNumber: maskPhone(phoneNumber) }, "WhatsApp connected");
        analysisQueue.backfillChats({ reason: "whatsapp_connected_backfill" }).catch((error) => {
          logger.warn({ error }, "Unable to queue WhatsApp connected backfill analysis");
        });
      }

      if (update.connection === "close") {
        const message = update.lastDisconnect?.error?.message ?? "WhatsApp disconnected";
        const statusCode = update.lastDisconnect?.error?.output?.statusCode;
        logger.warn({ statusCode, message, failure: update.lastDisconnect?.error?.data }, "WhatsApp connection closed");
        this.socket = undefined;
        if (statusCode === 515) {
          this.runtime = {
            ...this.runtime,
            status: "CONNECTING",
            qrCode: null,
            lastError: "WhatsApp requested a session restart after pairing."
          };
          this.io?.emit("whatsapp:connecting", this.getStatus());
          await this.persistSession("CONNECTING");
          setTimeout(() => {
            this.createSocket().catch((error) => logger.warn({ error }, "Unable to restart WhatsApp socket after pairing"));
          }, 1_000);
          return;
        }
        if (statusCode === 401 || statusCode === 403 || statusCode === 405 || statusCode === 419 || statusCode === 500) {
          await this.clearAuthFiles();
        }
        this.runtime = {
          ...this.runtime,
          status: "DISCONNECTED",
          qrCode: null,
          lastError:
            statusCode === 401
              ? "WhatsApp rejected the saved auth session. Auth files were cleared; request a new QR code."
              : statusCode === 405
                ? "WhatsApp rejected the QR registration attempt. Auth files were cleared; restart the server and generate a new QR."
              : statusCode
                ? `${message} (${statusCode})`
                : message
        };
        this.io?.emit("whatsapp:disconnected", this.getStatus());
        await this.persistSession("DISCONNECTED");
      }
    });

    await this.persistSession("CONNECTING");
    return sock;
  }

  async disconnect() {
    const sock = this.socket as { logout?: (message?: string) => Promise<void>; end?: (error?: Error) => void } | undefined;
    if (sock?.logout && (await this.hasRegisteredAuth())) {
      await sock.logout().catch((error) => logger.debug({ error }, "WhatsApp logout skipped because socket was already closed"));
    }
    sock?.end?.(new Error("Manual disconnect"));
    this.socket = undefined;
    this.runtime = { status: "DISCONNECTED", phoneNumber: null, qrCode: null, lastError: null };
    this.io?.emit("whatsapp:disconnected", this.getStatus());
    await this.persistSession("DISCONNECTED");
    return this.getStatus();
  }

  async resetAuth() {
    await this.endSocket("Reset auth session");
    await this.clearAuthFiles();
    this.socket = undefined;
    this.runtime = { status: "DISCONNECTED", phoneNumber: null, qrCode: null, lastError: null };
    this.io?.emit("whatsapp:disconnected", this.getStatus());
    await this.persistSession("DISCONNECTED");
    return { ...this.getStatus(), message: "WhatsApp auth session reset. Request a new QR code." };
  }

  async resync() {
    const queued = await analysisQueue.backfillChats({ reason: "manual_resync" });
    this.io?.emit("whatsapp:resync", queued);
    return { ...queued, message: "Existing MySQL chats queued for AI analysis. New Baileys history events will also be captured and analyzed." };
  }

  private async persistSession(status: WhatsAppSessionStatus, phoneNumber?: string | null) {
    await prisma.whatsAppSession.upsert({
      where: { id: 1 },
      update: {
        status,
        phoneNumber: phoneNumber ?? undefined,
        sessionPath: path.resolve(env.BAILEYS_AUTH_DIR),
        lastConnectedAt: status === "CONNECTED" ? new Date() : undefined
      },
      create: {
        id: 1,
        name: "Default WhatsApp",
        status,
        phoneNumber,
        sessionPath: path.resolve(env.BAILEYS_AUTH_DIR),
        lastConnectedAt: status === "CONNECTED" ? new Date() : undefined
      }
    });
  }

  private async hasRegisteredAuth() {
    const credsPath = path.resolve(env.BAILEYS_AUTH_DIR, "creds.json");
    try {
      const raw = await fs.readFile(credsPath, "utf8");
      const parsed = JSON.parse(raw) as { registered?: boolean };
      return Boolean(parsed.registered);
    } catch {
      return false;
    }
  }

  private async clearAuthFiles() {
    const authDir = path.resolve(env.BAILEYS_AUTH_DIR);
    await fs.rm(authDir, { recursive: true, force: true });
    await fs.mkdir(authDir, { recursive: true });
  }

  private async endSocket(reason: string) {
    const sock = this.socket as { end?: (error?: Error) => void } | undefined;
    sock?.end?.(new Error(reason));
    this.socket = undefined;
    await wait(250);
  }
}

export const whatsAppSessionManager = new WhatsAppSessionManager();

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBaileysBrowser(browsers: {
  ubuntu: (browser: string) => [string, string, string];
  windows: (browser: string) => [string, string, string];
  macOS: (browser: string) => [string, string, string];
  baileys: (browser: string) => [string, string, string];
}) {
  if (env.BAILEYS_BROWSER === "windows") return browsers.windows("Chrome");
  if (env.BAILEYS_BROWSER === "macos") return browsers.macOS("Google Chrome");
  if (env.BAILEYS_BROWSER === "baileys") return browsers.baileys("Chrome");
  return browsers.ubuntu("Chrome");
}
