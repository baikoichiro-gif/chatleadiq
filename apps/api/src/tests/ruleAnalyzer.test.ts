import { describe, expect, it } from "vitest";
import { analyzeWithRules } from "../services/analyzer/ruleAnalyzer.js";

describe("ruleAnalyzer", () => {
  it("marks invoice requests as HOT_NOW", () => {
    const result = analyzeWithRules([{ text: "Tolong kirim invoice dan nomor rekening hari ini", isFromMe: false, timestamp: new Date() }]);
    expect(result.leadStatus).toBe("HOT_NOW");
    expect(result.overallScore).toBeGreaterThan(60);
  });

  it("marks boss approval discussion as FOLLOW_UP_TOMORROW", () => {
    const result = analyzeWithRules([{ text: "Saya diskusi dulu dengan bos ya", isFromMe: false, timestamp: new Date() }]);
    expect(result.leadStatus).toBe("FOLLOW_UP_TOMORROW");
    expect(result.detected.objections).toContain("APPROVAL_NEEDED");
  });
});
