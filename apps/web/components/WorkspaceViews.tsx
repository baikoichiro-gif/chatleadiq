"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { getCustomerName, getCustomerNumber } from "../lib/contactDisplay";
import { pipelineColumns, sampleLeads } from "../lib/sample";
import { ConsentWarning, EmptyState, LeadStatusBadge, RiskNote, ScoreBar, StatCard } from "./ui";

type Lead = (typeof sampleLeads)[number] & {
  analyses?: AnalysisRecord[];
  suggestedReplies?: Array<{ id: number; text: string; status: string; createdAt?: string }>;
  followUpTasks?: Array<{ id: number; title: string; description?: string | null; dueAt: string; status: string }>;
  chat?: { messages?: Array<{ id: number; text: string; isFromMe: boolean; timestamp: string }> };
  interestScore?: number;
  buyingIntentScore?: number;
  urgencyScore?: number;
  budgetFitScore?: number;
  productMatchScore?: number;
  sentimentScore?: number;
  replyPriorityScore?: number;
  productInterestJson?: string;
  objectionsJson?: string;
  decisionStage?: string;
  summary?: string;
};

type AnalysisRecord = {
  id: number;
  engine: string;
  inputHash?: string;
  resultJson?: string;
  createdAt: string;
};

type AuditLog = {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  metadataJson?: string;
  createdAt: string;
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
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    refreshFollowUps()
      .then((data) => setTasks(data.tasks))
      .catch(() =>
        setTasks(buildSampleFollowUps())
      );
  }, []);

  async function runAiFollowUpAnalysis() {
    setBusy(true);
    setNotice("");
    try {
      const result = await apiFetch<{ queuedChats: number }>("/api/analysis/backfill", { method: "POST", body: JSON.stringify({ limit: 100 }) });
      setNotice(`${result.queuedChats} chats queued for AI follow-up analysis.`);
      const next = await refreshFollowUps();
      setTasks(next.tasks);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to queue AI analysis.");
    } finally {
      setBusy(false);
    }
  }

  async function updateTask(id: number, status: "DONE" | "CANCELLED") {
    await apiFetch(`/api/followups/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    const next = await refreshFollowUps();
    setTasks(next.tasks);
  }

  const buckets = useMemo(() => bucketFollowUps(tasks), [tasks]);
  const dueToday = buckets.overdue.length + buckets.today.length;

  return (
    <div className="stack">
      <div className="statsGrid">
        <StatCard label="AI Follow-ups" value={tasks.length} detail="pending tasks" />
        <StatCard label="Due Today" value={dueToday} tone="yellow" detail="overdue + today" />
        <StatCard label="Tomorrow" value={buckets.tomorrow.length} tone="green" detail="planned by AI" />
        <StatCard label="Upcoming" value={buckets.upcoming.length} tone="purple" detail="future queue" />
        <StatCard label="Draft-only" value="ON" tone="green" detail="human approval" />
      </div>

      <section className="panel followupControl">
        <div>
          <h2>AI Follow-up Queue</h2>
          <p className="muted">Tasks are created from the AI analyzer reading full WhatsApp chat history. Replies remain draft-only.</p>
        </div>
        <button className="primary" disabled={busy} onClick={runAiFollowUpAnalysis}>
          {busy ? "Queueing..." : "Run AI Follow-up Analysis"}
        </button>
        {notice ? <span className="statusPill cyan">{notice}</span> : null}
      </section>

      <div className="followupBoard">
        <FollowupColumn title="Overdue" tasks={buckets.overdue} tone="risk" onUpdate={updateTask} />
        <FollowupColumn title="Today" tasks={buckets.today} tone="warm" onUpdate={updateTask} />
        <FollowupColumn title="Tomorrow" tasks={buckets.tomorrow} tone="good" onUpdate={updateTask} />
        <FollowupColumn title="Upcoming" tasks={buckets.upcoming} tone="neutral" onUpdate={updateTask} />
      </div>

      <section className="stack">
        <ConsentWarning />
        <RiskNote text="Do-not-contact leads are excluded from follow-up queues by default." />
      </section>
    </div>
  );
}

type FollowUpTask = {
  id: number;
  title: string;
  description?: string | null;
  dueAt: string;
  status: string;
  lead?: Lead & {
    suggestedReplies?: Array<{ id: number; text: string; status: string }>;
    analyses?: Array<{ id: number; engine: string; createdAt: string }>;
  };
};

type FollowupsResponse = {
  tasks: FollowUpTask[];
};

function FollowupColumn({
  title,
  tasks,
  tone,
  onUpdate
}: {
  title: string;
  tasks: FollowUpTask[];
  tone: "good" | "warm" | "risk" | "neutral";
  onUpdate: (id: number, status: "DONE" | "CANCELLED") => Promise<void>;
}) {
  return (
    <section className="followupColumn">
      <div className="followupColumnHeader">
        <h2>{title}</h2>
        <span className={`leadBadge ${tone}`}>{tasks.length}</span>
      </div>
      {tasks.length ? (
        tasks.map((task) => <FollowupCard key={task.id} task={task} onUpdate={onUpdate} />)
      ) : (
        <EmptyState title="No tasks" text="No AI follow-up is due in this bucket." />
      )}
    </section>
  );
}

function FollowupCard({ task, onUpdate }: { task: FollowUpTask; onUpdate: (id: number, status: "DONE" | "CANCELLED") => Promise<void> }) {
  const lead = task.lead;
  const draft = lead?.suggestedReplies?.[0];
  const analysis = lead?.analyses?.[0];
  return (
    <article className="followupCard">
      <div className="followupCardTop">
        {lead ? <LeadStatusBadge status={lead.status} /> : <span className="leadBadge neutral">PENDING</span>}
        <span>{formatDue(task.dueAt)}</span>
      </div>
      <strong>{task.title}</strong>
      <small>{getCustomerNumber(lead?.contact)}</small>
      {task.description ? <p>{task.description}</p> : null}
      {draft?.text ? (
        <div className="draftPreview">
          <span>Draft reply</span>
          <p>{draft.text}</p>
        </div>
      ) : null}
      <div className="followupMeta">
        <span>{analysis?.engine ?? "AI pending"}</span>
        <span>Human approval required</span>
      </div>
      <div className="buttonRow">
        <button className="mini" onClick={() => onUpdate(task.id, "DONE")}>
          Done
        </button>
        <button className="ghost" onClick={() => onUpdate(task.id, "CANCELLED")}>
          Cancel
        </button>
      </div>
    </article>
  );
}

function refreshFollowUps() {
  return apiFetch<FollowupsResponse>("/api/followups");
}

function buildSampleFollowUps(): FollowUpTask[] {
  return [
    {
      id: 1,
      title: "Send invoice details after human review",
      description: "AI reason: customer asked for invoice today.\nPriority: high\nHuman approval required before sending any reply.",
      dueAt: new Date().toISOString(),
      status: "PENDING",
      lead: sampleLeads[0]
    },
    {
      id: 2,
      title: "Follow up price objection with value context",
      description: "AI reason: customer compared price and needs reassurance.\nPriority: medium\nHuman approval required before sending any reply.",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "PENDING",
      lead: sampleLeads[1]
    }
  ];
}

function bucketFollowUps(tasks: FollowUpTask[]) {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfTomorrow = new Date(endOfToday.getTime() + 1);
  const endOfTomorrow = new Date(startOfTomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);

  return {
    overdue: tasks.filter((task) => new Date(task.dueAt) < now),
    today: tasks.filter((task) => {
      const dueAt = new Date(task.dueAt);
      return dueAt >= now && dueAt <= endOfToday;
    }),
    tomorrow: tasks.filter((task) => {
      const dueAt = new Date(task.dueAt);
      return dueAt >= startOfTomorrow && dueAt <= endOfTomorrow;
    }),
    upcoming: tasks.filter((task) => new Date(task.dueAt) > endOfTomorrow)
  };
}

function formatDue(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
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
  const fallbackLead = sampleLeads.find((item) => String(item.id) === id) ?? sampleLeads[0];
  const [detail, setDetail] = useState<{ lead: Lead | null; auditLogs: AuditLog[] }>({ lead: fallbackLead, auditLogs: [] });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadLeadDetail(id)
      .then(setDetail)
      .catch(() => undefined);
  }, [id]);

  async function action(path: string, successMessage: string) {
    setNotice("");
    await apiFetch(path, { method: "POST" });
    const next = await loadLeadDetail(id);
    setDetail(next);
    setNotice(successMessage);
  }

  const lead = detail.lead;
  if (!lead) return <EmptyState title="Lead not found" text="No CRM record is available for this lead." />;

  const latestAnalysis = lead.analyses?.[0];
  const aiResult = parseJson<AiAnalysisResult>(latestAnalysis?.resultJson);
  const summary = parseJson<LeadSummary>(lead.summary) ?? aiResult?.summary;
  const detected = aiResult?.detected;
  const followUpTask = aiResult?.followUpTask;
  const draft = lead.suggestedReplies?.[0];
  const activeTask = lead.followUpTasks?.find((task) => task.status === "PENDING") ?? lead.followUpTasks?.[0];
  const productInterest = parseJson<string[]>(lead.productInterestJson) ?? detected?.products ?? [];
  const objections = parseJson<string[]>(lead.objectionsJson) ?? detected?.objections ?? [];
  const messages = lead.chat?.messages ?? [
    { id: 1, text: "Bisa kirim invoice hari ini?", isFromMe: false, timestamp: new Date().toISOString() },
    { id: 2, text: "Bisa, saya siapkan draft invoice untuk dicek dulu.", isFromMe: true, timestamp: new Date().toISOString() }
  ];

  return (
    <div className="stack">
      <div className="statsGrid">
        <StatCard label="Overall" value={lead.overallScore} detail="AI lead score" />
        <StatCard label="Buying Intent" value={lead.buyingIntentScore ?? aiResult?.scores.buyingIntentScore ?? lead.overallScore} tone="green" detail="purchase signal" />
        <StatCard label="Urgency" value={lead.urgencyScore ?? aiResult?.scores.urgencyScore ?? 0} tone="yellow" detail="timing pressure" />
        <StatCard label="Spam Risk" value={lead.spamRiskScore} tone={lead.spamRiskScore > 70 ? "red" : "green"} detail="consent guardrail" />
        <StatCard label="AI Engine" value={latestAnalysis ? "AI" : "Pending"} tone="purple" detail={latestAnalysis ? `${latestAnalysis.engine} · ${formatDate(latestAnalysis.createdAt)}` : "no analysis yet"} />
      </div>

      <div className="leadDetailBoard">
        <section className="panel leadOverviewPanel">
          <div className="sectionHeader">
            <div>
              <h2>{getCustomerNumber(lead.contact)}</h2>
              <p>{getCustomerName(lead.contact) ?? "No saved name"} · {lead.decisionStage ?? "decision stage pending"}</p>
            </div>
            <LeadStatusBadge status={lead.status} />
          </div>
          <ScoreBar label="Interest" value={lead.interestScore ?? aiResult?.scores.interestScore ?? 0} />
          <ScoreBar label="Product match" value={lead.productMatchScore ?? aiResult?.scores.productMatchScore ?? 0} />
          <ScoreBar label="Reply priority" value={lead.replyPriorityScore ?? aiResult?.scores.replyPriorityScore ?? Math.max(0, lead.overallScore - lead.spamRiskScore / 4)} />
          <div className="buttonRow">
            <button className="primary" onClick={() => action(`/api/leads/${lead.id}/mark-won`, "Lead marked as won.")}>Mark Won</button>
            <button className="ghost" onClick={() => action(`/api/leads/${lead.id}/mark-lost`, "Lead marked as lost.")}>Mark Lost</button>
            <button className="danger" onClick={() => action(`/api/leads/${lead.id}/do-not-contact`, "Lead marked as do-not-contact.")}>Do Not Contact</button>
          </div>
          {notice ? <p className="formError">{notice}</p> : null}
        </section>

        <section className="panel aiSummaryPanel">
          <h2>AI Summary</h2>
          <div className="insightGrid">
            <InsightBlock label="Conversation" value={summary?.shortSummary ?? "No AI summary yet."} />
            <InsightBlock label="Customer Need" value={summary?.customerNeed ?? "Unknown"} />
            <InsightBlock label="Opportunity" value={summary?.salesOpportunity ?? lead.nextBestAction} />
            <InsightBlock label="Risk" value={summary?.risk ?? "No risk summary available."} />
          </div>
        </section>

        <section className="panel aiSignalsPanel">
          <h2>AI Signals</h2>
          <SignalGroup label="Buying signals" values={detected?.buyingSignals ?? []} empty="No buying signal detected." />
          <SignalGroup label="Objections" values={objections} empty="No objection detected." />
          <SignalGroup label="Products" values={productInterest} empty="No product extracted." />
          <SignalGroup label="Time signals" values={detected?.timeSignals ?? []} empty="No timing signal detected." />
        </section>
      </div>

      <div className="leadDetailWide">
        <section className="panel timeline">
          <div className="sectionHeader">
            <div>
              <h2>Chat History</h2>
              <p>{messages.length} messages used as customer context.</p>
            </div>
          </div>
          {messages.map((message) => (
            <article className={message.isFromMe ? "bubble mine" : "bubble"} key={message.id}>
              <span>{message.isFromMe ? "Sales" : "Customer"}</span>
              <p>{message.text}</p>
              <small>{formatDate(message.timestamp)}</small>
            </article>
          ))}
        </section>

        <aside className="stack">
          <section className="panel">
            <h2>Draft Reply</h2>
            <p className="suggested">{draft?.text || aiResult?.recommendation.suggestedReply || "No draft reply generated yet."}</p>
            <div className="followupMeta">
              <span>{draft?.status ?? "DRAFT"}</span>
              <span>Human approval required</span>
            </div>
          </section>

          <section className="panel">
            <h2>Follow-up Reason</h2>
            <div className="followupReason">
              <strong>{activeTask?.title || followUpTask?.title || lead.nextBestAction}</strong>
              <p>{activeTask?.description || followUpTask?.reason || aiResult?.recommendation.reason || "No follow-up reason available."}</p>
              <small>{activeTask?.dueAt ? `Due ${formatDate(activeTask.dueAt)}` : followUpTask?.dueAtIso ? `AI proposed ${formatDate(followUpTask.dueAtIso)}` : "No due date"}</small>
            </div>
          </section>

          <section className="panel">
            <h2>AI Audit Trail</h2>
            <div className="auditList">
              {(lead.analyses ?? []).map((analysis) => (
                <article className="auditItem" key={analysis.id}>
                  <strong>{analysis.engine}</strong>
                  <span>{formatDate(analysis.createdAt)}</span>
                  {analysis.inputHash ? <small>input {analysis.inputHash.slice(0, 12)}</small> : null}
                </article>
              ))}
              {detail.auditLogs.map((log) => (
                <article className="auditItem" key={`audit-${log.id}`}>
                  <strong>{log.action.replaceAll("_", " ")}</strong>
                  <span>{formatDate(log.createdAt)}</span>
                </article>
              ))}
              {!lead.analyses?.length && !detail.auditLogs.length ? <EmptyState title="No audit yet" text="Run analysis to create an AI audit trail." /> : null}
            </div>
          </section>

          <ConsentWarning />
        </aside>
      </div>
    </div>
  );
}

type LeadSummary = {
  shortSummary: string;
  customerNeed: string;
  salesOpportunity: string;
  risk: string;
};

type AiAnalysisResult = {
  scores: {
    interestScore: number;
    buyingIntentScore: number;
    urgencyScore: number;
    productMatchScore: number;
    replyPriorityScore: number;
  };
  detected: {
    products: string[];
    timeSignals: string[];
    objections: string[];
    buyingSignals: string[];
  };
  recommendation: {
    reason: string;
    suggestedReply: string;
  };
  followUpTask?: {
    title: string;
    reason: string;
    dueAtIso: string | null;
  };
  summary: LeadSummary;
};

function InsightBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="insightBlock">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function SignalGroup({ label, values, empty }: { label: string; values: string[]; empty: string }) {
  return (
    <div className="signalGroup">
      <span>{label}</span>
      <div>
        {values.length ? values.map((value) => <small key={value}>{value}</small>) : <em>{empty}</em>}
      </div>
    </div>
  );
}

function loadLeadDetail(id: string) {
  return apiFetch<{ lead: Lead; auditLogs: AuditLog[] }>(`/api/leads/${id}`);
}

function parseJson<T>(value?: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
