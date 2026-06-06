import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatLeadIQ",
  description: "Open-source, consent-aware AI lead scoring CRM for WhatsApp sales conversations."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
