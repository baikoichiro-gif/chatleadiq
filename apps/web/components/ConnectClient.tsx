"use client";

import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { API_URL, apiFetch } from "../lib/api";
import { ConsentWarning, SafetyList } from "./ui";

type Status = {
  status: string;
  phoneNumber: string | null;
  qrCode: string | null;
  lastError: string | null;
};

export function ConnectClient() {
  const [status, setStatus] = useState<Status>({ status: "DISCONNECTED", phoneNumber: null, qrCode: null, lastError: null });
  const [busy, setBusy] = useState(false);
  const [uiError, setUiError] = useState("");
  const socket = useMemo(() => io(API_URL, { withCredentials: true, autoConnect: false }), []);

  useEffect(() => {
    apiFetch<Status>("/api/whatsapp/status").then(setStatus).catch(() => undefined);
    socket.connect();
    socket.on("whatsapp:qr", setStatus);
    socket.on("whatsapp:connected", setStatus);
    socket.on("whatsapp:disconnected", setStatus);
    socket.on("whatsapp:connecting", setStatus);
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  async function action(path: string) {
    setBusy(true);
    setUiError("");
    try {
      const next = await apiFetch<Status>(path, { method: "POST" });
      setStatus(next);
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function generateQr() {
    setBusy(true);
    setUiError("");
    try {
      const next = await apiFetch<Status>("/api/whatsapp/qr");
      setStatus(next);
    } catch (error) {
      setUiError(error instanceof Error ? error.message : "Unable to generate QR code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid two">
      <section className="panel qrPanel">
        <div className="sectionHeader">
          <div>
            <h2>WhatsApp Connection</h2>
            <p>Scan the QR from WhatsApp Linked Devices to connect this app.</p>
          </div>
          <span className={`connectionDot ${status.status.toLowerCase()}`} />
        </div>
        <div className="qrBox">
          {status.status === "CONNECTED" ? (
            <span>Connected</span>
          ) : status.qrCode ? (
            <img src={status.qrCode} alt="WhatsApp login QR code" />
          ) : (
            <span>QR code will appear here</span>
          )}
        </div>
        <div className="buttonRow">
          <button className="primary" disabled={busy} onClick={generateQr}>
            Generate QR
          </button>
          <button className="ghost" disabled={busy} onClick={() => action("/api/whatsapp/connect")}>
            Reconnect Linked Session
          </button>
          <button className="ghost" disabled={busy} onClick={() => action("/api/whatsapp/disconnect")}>
            Disconnect
          </button>
          <button className="danger" disabled={busy} onClick={() => action("/api/whatsapp/reset-auth")}>
            Reset Session
          </button>
          <button className="ghost" disabled={busy} onClick={() => action("/api/whatsapp/resync")}>
            Resync
          </button>
        </div>
        <dl className="metaList">
          <div>
            <dt>Status</dt>
            <dd>{status.status}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{status.phoneNumber ?? "Not paired"}</dd>
          </div>
          <div>
            <dt>Error</dt>
            <dd>{status.lastError ?? "None"}</dd>
          </div>
        </dl>
        {uiError ? <p className="formError">{uiError}</p> : null}
      </section>
      <section className="stack">
        <ConsentWarning />
        <div className="panel">
          <h2>Session Safety</h2>
          <p className="muted">Baileys auth state is stored under the configured server folder and excluded from Git.</p>
          <SafetyList />
        </div>
      </section>
    </div>
  );
}
