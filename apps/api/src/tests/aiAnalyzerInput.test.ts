import { describe, expect, it } from "vitest";
import { buildAiAnalysisInput } from "../services/analyzer/aiAnalyzer.js";

describe("AI analyzer input", () => {
  it("sends chat history and scoring rubric without rule result scoring", () => {
    const input = buildAiAnalysisInput(
      [
        { text: "Harga berapa dan bisa kirim hari ini?", isFromMe: false, timestamp: new Date("2026-01-01T10:00:00Z"), senderName: "Rina" },
        { text: "Bisa, saya cek ongkirnya dulu.", isFromMe: true, timestamp: new Date("2026-01-01T10:02:00Z"), senderName: "Sales" }
      ],
      {
        contact: {
          waJid: "628123@s.whatsapp.net",
          pushName: "Rina",
          consentStatus: "UNKNOWN",
          doNotContact: false
        },
        previousLead: null,
        maxHistoryMessages: 100
      }
    );

    expect(input.chatHistory).toHaveLength(2);
    expect(input.scoreRubric.buyingIntentScore).toContain("order/payment/invoice/address/PO");
    expect(JSON.stringify(input)).not.toContain("ruleResult");
  });
});
