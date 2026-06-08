"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { getCustomerName, getCustomerNumber } from "../lib/contactDisplay";
import { pipelineColumns, sampleLeads } from "../lib/sample";
import { ConsentWarning, EmptyState, LeadStatusBadge, RiskNote, ScoreBar, StatCard } from "./ui";

type Lead = (typeof sampleLeads)[number] & {
  analyses?: Array<{ id: number; engine: string; createdAt: string }>;
  suggestedReplies?: Array<{ id: number; text: string; status: string }>;
  followUpTasks?: Array<{ id: number; title: string; dueAt: string; status: string }>;
  chat?: { messages?: Array<{ id: number; text: string; isFromMe: boolean; timestamp: string }> };
};

export function PipelineView() {
  const [leads, setLeads] = useState<Lead[]>(sampleLeads);
  useEffect(() => {
    apiFetch<{ leads: Lead[] }>("/api/leads").then((data) => setLeads(data.leads)).catch(() => undefined);
  }, []);
  return (
    <div className="pipeline">
      {pipelineColumns.map((column) => (
        <section className="kanbanColumn" key={column}>
          <h2>{column.replaceAll("_", " ")}</h2>
          {leads
            .filter((lead) => lead.status === column)
            .map((lead) => (
              <article className="leadCard" key={lead.id}>
                <LeadStatusBadge status={lead.status} />
                <strong>{getCustomerNumber(lead.contact)}</strong>
                <p>{lead.nextBestAction}</p>
                <span>{lead.overallScore} score</span>
              </article>
            ))}
        </section>
      ))}
    </div>
  );
}

export function FollowupsView() {
  const [tasks, setTasks] = useState<Array<{ id: number; title: string; dueAt: string; lead?: Lead }>>([]);
  useEffect(() => {
    apiFetch<{ tasks: Array<{ id: number; title: string; dueAt: string; lead?: Lead }> }>("/api/followups/today")
      .then((data) => setTasks(data.tasks))
      .catch(() =>
        setTasks([
          { id: 1, title: "Kirim invoice setelah approval", dueAt: new Date().toISOString(), lead: sampleLeads[0] },
          { id: 2, title: "Follow-up ringan soal diskusi internal", dueAt: new Date(Date.now() + 86400000).toISOString(), lead: sampleLeads[1] }
        ])
      );
  }, []);
  return (
    <div className="grid two">
      <section className="panel">
        <h2>Today Queue</h2>
        <div className="queue">
          {tasks.map((task) => (
            <article className="queueItem" key={task.id}>
              <div>
                <strong>{task.title}</strong>
                <small>{getCustomerNumber(task.lead?.contact)} · {new Date(task.dueAt).toLocaleString()}</small>
              </div>
              <button className="mini">Done</button>
            </article>
          ))}
        </div>
      </section>
      <section className="stack">
        <ConsentWarning />
        <RiskNote text="Do-not-contact leads are excluded from follow-up queues by default." />
      </section>
    </div>
  );
}

export function AnalyticsView() {
  const totals = useMemo(() => {
    return pipelineColumns.map((status) => ({ status, count: sampleLeads.filter((lead) => lead.status === status).length }));
  }, []);
  return (
    <div className="grid two">
      <section className="panel">
        <h2>Lead Status Distribution</h2>
        <div className="chartList">
          {totals.map((row) => (
            <ScoreBar key={row.status} label={row.status.replaceAll("_", " ")} value={row.count * 30} />
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Objection Analytics</h2>
        <ScoreBar label="PRICE" value={68} />
        <ScoreBar label="APPROVAL_NEEDED" value={44} />
        <ScoreBar label="SHIPPING" value={27} />
        <ScoreBar label="WARRANTY" value={18} />
      </section>
    </div>
  );
}

export function SettingsView() {
  return (
    <div className="grid two">
      <section className="panel settingsForm">
        <h2>Analyzer Settings</h2>
        <label>
          AI analyzer
          <select defaultValue="enabled">
            <option value="enabled">Enabled when API key exists</option>
            <option value="disabled">Rule based only</option>
          </select>
        </label>
        <label>
          Max messages per analysis
          <input type="number" defaultValue={100} />
        </label>
        <label>
          Follow-up cooldown hours
          <input type="number" defaultValue={24} />
        </label>
        <label>
          Business type
          <input defaultValue="WhatsApp sales team" />
        </label>
      </section>
      <section className="panel settingsForm">
        <h2>Privacy Settings</h2>
        <label>
          Sync recent chats only
          <select defaultValue="true">
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </label>
        <label>
          Mask phone in logs
          <select defaultValue="true">
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </label>
        <ConsentWarning />
      </section>
    </div>
  );
}

export function LeadDetailView({ id }: { id: string }) {
  const [lead, setLead] = useState<Lead | null>(sampleLeads.find((item) => String(item.id) === id) ?? sampleLeads[0]);
  useEffect(() => {
    apiFetch<{ lead: Lead }>(`/api/leads/${id}`).then((data) => setLead(data.lead)).catch(() => undefined);
  }, [id]);
  if (!lead) return <EmptyState title="Lead not found" text="No CRM record is available for this lead." />;
  const messages = lead.chat?.messages ?? [
    { id: 1, text: "Bisa kirim invoice hari ini?", isFromMe: false, timestamp: new Date().toISOString() },
    { id: 2, text: "Bisa, saya siapkan draft invoice untuk dicek dulu.", isFromMe: true, timestamp: new Date().toISOString() }
  ];
  return (
    <div className="grid leadDetail">
      <section className="panel">
        <div className="sectionHeader">
          <div>
            <h2>{getCustomerNumber(lead.contact)}</h2>
            <p>{getCustomerName(lead.contact) ?? "No saved name"}</p>
          </div>
          <LeadStatusBadge status={lead.status} />
        </div>
        <div className="scoreGrid">
          <StatCard label="Overall" value={lead.overallScore} />
          <StatCard label="Spam Risk" value={lead.spamRiskScore} tone={lead.spamRiskScore > 70 ? "red" : "green"} />
        </div>
        <ScoreBar label="Buying intent" value={lead.overallScore} />
        <ScoreBar label="Reply priority" value={Math.max(0, lead.overallScore - lead.spamRiskScore / 4)} />
        <div className="buttonRow">
          <button className="primary">Mark Won</button>
          <button className="ghost">Mark Lost</button>
          <button className="danger">Do Not Contact</button>
        </div>
      </section>
      <section className="panel timeline">
        <h2>Chat Timeline</h2>
        {messages.map((message) => (
          <article className={message.isFromMe ? "bubble mine" : "bubble"} key={message.id}>
            <span>{message.isFromMe ? "Sales" : "Customer"}</span>
            <p>{message.text}</p>
            <small>{new Date(message.timestamp).toLocaleString()}</small>
          </article>
        ))}
      </section>
      <aside className="stack">
        <section className="panel">
          <h2>Suggested Reply</h2>
          <p className="suggested">Baik, saya bantu rangkum opsinya dulu ya. Nanti Bapak/Ibu bisa cek dan kabari kalau sudah cocok.</p>
          <div className="buttonRow">
            <button className="primary">Approve Draft</button>
            <button className="ghost">Reject</button>
          </div>
        </section>
        <ConsentWarning />
      </aside>
    </div>
  );
}
