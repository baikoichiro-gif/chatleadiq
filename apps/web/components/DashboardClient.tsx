"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import { API_URL, apiFetch } from "../lib/api";
import { getCustomerName, getCustomerNumber } from "../lib/contactDisplay";
import { sampleChats, sampleLeads } from "../lib/sample";
import { ConsentWarning, LeadStatusBadge, ScoreBar, StatCard } from "./ui";

type Lead = (typeof sampleLeads)[number];
type Chat = (typeof sampleChats)[number] & { waChatId?: string | null };

export function DashboardClient() {
  const [leads, setLeads] = useState<Lead[]>(sampleLeads);
  const [chats, setChats] = useState<Chat[]>(sampleChats);

  useEffect(() => {
    const refresh = () => {
      apiFetch<{ leads: Lead[] }>("/api/leads").then((data) => setLeads(data.leads)).catch(() => undefined);
      apiFetch<{ chats: Chat[] }>("/api/chats?recent=true").then((data) => setChats(data.chats)).catch(() => undefined);
    };
    refresh();
    const socket = io(API_URL, { withCredentials: true });
    socket.on("message:new", refresh);
    socket.on("lead:analyzed", refresh);
    socket.on("analysis:backfill-queued", refresh);
    return () => {
      socket.disconnect();
    };
  }, []);

  const stats = useMemo(
    () => ({
      total: leads.length,
      hot: leads.filter((lead) => lead.status === "HOT_NOW").length,
      follow: leads.filter((lead) => String(lead.status).includes("FOLLOW")).length,
      dnc: leads.filter((lead) => lead.status === "DO_NOT_CONTACT_YET").length,
      wonLost: leads.filter((lead) => ["WON", "LOST"].includes(lead.status)).length
    }),
    [leads]
  );

  return (
    <div className="stack">
      <div className="statsGrid">
        <StatCard label="Total Leads" value={stats.total} detail="from MySQL" />
        <StatCard label="Hot Leads" value={stats.hot} tone="green" detail="act with approval" />
        <StatCard label="Follow-up Today" value={stats.follow} tone="yellow" detail="cooldown aware" />
        <StatCard label="Do Not Contact" value={stats.dnc} tone="red" detail="opt-out respected" />
        <StatCard label="Won / Lost" value={stats.wonLost} tone="purple" detail="pipeline outcomes" />
      </div>
      <div className="grid dashboardGrid">
        <section className="panel tablePanel">
          <div className="sectionHeader">
            <div>
              <h2>Recent Incoming Chats</h2>
              <p>Latest WhatsApp conversations stored in MySQL.</p>
            </div>
            <Link className="textLink" href="/chats">
              View all
            </Link>
          </div>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Signal</th>
                <th>Lead</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {chats.map((chat) => (
                <tr key={chat.id}>
                  <td>
                    <strong>{getCustomerNumber(chat.contact, chat.waChatId)}</strong>
                    <small>{chat.messages?.[0]?.text ?? "No messages yet"}</small>
                  </td>
                  <td>{chat.lead?.nextBestAction ?? "analyze"}</td>
                  <td>
                    {chat.lead ? <LeadStatusBadge status={chat.lead.status} /> : <span className="muted">Pending analysis</span>}
                  </td>
                  <td>{chat.lead?.overallScore ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="stack">
          <ConsentWarning />
          <section className="panel">
            <h2>Scoring Activity</h2>
            <ScoreBar label="Buying intent" value={82} />
            <ScoreBar label="Reply priority" value={74} />
            <ScoreBar label="Spam risk" value={18} />
          </section>
        </aside>
      </div>
    </div>
  );
}

export function ChatsClient() {
  const [search, setSearch] = useState("");
  const [chats, setChats] = useState<Chat[]>(sampleChats);
  useEffect(() => {
    const refresh = () => apiFetch<{ chats: Chat[] }>("/api/chats").then((data) => setChats(data.chats)).catch(() => undefined);
    refresh();
    const socket = io(API_URL, { withCredentials: true });
    socket.on("message:new", refresh);
    socket.on("lead:analyzed", refresh);
    return () => {
      socket.disconnect();
    };
  }, []);
  async function analyze(chatId: number) {
    await apiFetch(`/api/chats/${chatId}/analyze`, { method: "POST" }).catch(() => undefined);
    apiFetch<{ chats: Chat[] }>("/api/chats").then((data) => setChats(data.chats)).catch(() => undefined);
  }
  const filtered = chats.filter((chat) => JSON.stringify(chat).toLowerCase().includes(search.toLowerCase()));
  return (
    <section className="panel tablePanel">
      <div className="toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chat, customer, product signal" />
        <button className="ghost">Unread</button>
        <button className="ghost">Recent</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Chat</th>
            <th>Last Message</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((chat) => (
            <tr key={chat.id}>
              <td>
                <strong>{getCustomerNumber(chat.contact, chat.waChatId)}</strong>
                <small>{getCustomerName(chat.contact, chat.name) ?? "No saved name"}</small>
              </td>
              <td>{chat.messages?.[0]?.text ?? "No message"}</td>
              <td>
                {chat.lead ? <LeadStatusBadge status={chat.lead.status} /> : <span className="muted">Pending analysis</span>}
              </td>
              <td>
                <button className="mini" onClick={() => analyze(chat.id)}>
                  Analyze
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function LeadsClient() {
  const [leads, setLeads] = useState<Lead[]>(sampleLeads);
  const [status, setStatus] = useState("");
  useEffect(() => {
    const refresh = () => apiFetch<{ leads: Lead[] }>("/api/leads").then((data) => setLeads(data.leads)).catch(() => undefined);
    refresh();
    const socket = io(API_URL, { withCredentials: true });
    socket.on("lead:analyzed", refresh);
    socket.on("analysis:backfill-queued", refresh);
    return () => {
      socket.disconnect();
    };
  }, []);
  const filtered = status ? leads.filter((lead) => lead.status === status) : leads;
  return (
    <section className="panel tablePanel">
      <div className="toolbar">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {Array.from(new Set(leads.map((lead) => lead.status))).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input placeholder="Search customer or product" />
      </div>
      <table>
        <thead>
          <tr>
            <th>Lead</th>
            <th>Status</th>
            <th>Score</th>
            <th>Spam Risk</th>
            <th>Next Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((lead) => (
            <tr key={lead.id}>
              <td>
                <Link href={`/leads/${lead.id}`}>{getCustomerNumber(lead.contact)}</Link>
                <small>{getCustomerName(lead.contact) ?? "No saved name"}</small>
              </td>
              <td>
                <LeadStatusBadge status={lead.status} />
              </td>
              <td>{lead.overallScore}</td>
              <td>{lead.spamRiskScore}</td>
              <td>{lead.nextBestAction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
