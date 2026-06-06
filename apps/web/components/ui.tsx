import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";

export function StatCard({ label, value, tone = "cyan", detail }: { label: string; value: string | number; tone?: string; detail?: string }) {
  return (
    <div className={`panel stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export function LeadStatusBadge({ status }: { status: string }) {
  const tone = status.includes("HOT") || status === "WON" ? "good" : status.includes("DO_NOT") || status === "LOST" ? "risk" : status.includes("FOLLOW") ? "warm" : "neutral";
  return <span className={`leadBadge ${tone}`}>{status.replaceAll("_", " ")}</span>;
}

export function ConsentWarning() {
  return (
    <div className="consentWarning">
      <ShieldAlert size={20} />
      <p>
        Use ChatLeadIQ only with WhatsApp accounts and conversations you are authorized to manage. Respect customer consent and opt-out requests.
        ChatLeadIQ stores chat history in your configured MySQL database and does not send messages automatically.
      </p>
    </div>
  );
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="scoreBar">
      <div>
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <i>
        <em style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </i>
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="emptyState">
      <Clock3 size={28} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export function SafetyList() {
  return (
    <div className="safetyList">
      {["No auto-send", "No broadcast endpoint", "Opt-out respected", "Audit log enabled"].map((item) => (
        <span key={item}>
          <CheckCircle2 size={15} /> {item}
        </span>
      ))}
    </div>
  );
}

export function RiskNote({ text }: { text: string }) {
  return (
    <div className="riskNote">
      <AlertTriangle size={16} />
      <span>{text}</span>
    </div>
  );
}
