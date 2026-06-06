import { describe, expect, it } from "vitest";
import { analyzeWithRules } from "../services/analyzer/ruleAnalyzer.js";

describe("spam risk", () => {
  it("raises spam risk after repeated sales messages without customer reply", () => {
    const result = analyzeWithRules([
      { text: "Halo, masih minat?", isFromMe: true, timestamp: new Date() },
      { text: "Saya follow up ya", isFromMe: true, timestamp: new Date() },
      { text: "Bisa dibantu konfirmasi?", isFromMe: true, timestamp: new Date() },
      { text: "Halo?", isFromMe: true, timestamp: new Date() }
    ]);
    expect(result.leadStatus).toBe("DO_NOT_CONTACT_YET");
    expect(result.scores.spamRiskScore).toBeGreaterThanOrEqual(50);
  });
});
