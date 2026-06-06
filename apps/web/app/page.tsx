import Link from "next/link";
import { ArrowRight, Github, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { ConsentWarning } from "../components/ui";

export default function HomePage() {
  return (
    <main className="landing">
      <header className="landingNav">
        <Link href="/" className="brand">
          <span className="brandMark">
            <MessageSquareText size={20} />
          </span>
          <strong>ChatLeadIQ</strong>
        </Link>
        <nav>
          <Link href="/login">Login</Link>
          <Link href="/dashboard">Dashboard</Link>
          <a href="https://github.com/baikoichiro-gif/chatleadiq">GitHub</a>
        </nav>
      </header>
      <section className="hero">
        <div className="heroCopy">
          <h1>AI lead scoring for WhatsApp sales conversations.</h1>
          <p>
            Connect your WhatsApp, store chat history in MySQL, analyze customer buying intent, prioritize follow-ups, and draft human-approved
            replies without auto-spam.
          </p>
          <div className="buttonRow">
            <Link className="primary" href="/connect">
              Connect WhatsApp <ArrowRight size={17} />
            </Link>
            <a className="ghost" href="https://github.com/baikoichiro-gif/chatleadiq">
              <Github size={17} /> View GitHub
            </a>
          </div>
        </div>
        <div className="heroProduct">
          <div className="mockTop">
            <span />
            <span />
            <span />
          </div>
          <div className="mockGrid">
            <div className="mockPanel tall">
              <strong>Hot Now</strong>
              <b>91</b>
              <small>Invoice requested</small>
            </div>
            <div className="mockPanel">
              <ShieldCheck size={22} />
              <span>Consent-aware safeguards</span>
            </div>
            <div className="mockPanel">
              <Sparkles size={22} />
              <span>Rule-based + optional AI</span>
            </div>
            <div className="mockPanel wide">
              <p>Suggested reply requires human approval before sending.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="landingBand">
        <ConsentWarning />
      </section>
    </main>
  );
}
