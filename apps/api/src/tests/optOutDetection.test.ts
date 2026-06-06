import { describe, expect, it } from "vitest";
import { analyzeWithRules } from "../services/analyzer/ruleAnalyzer.js";

describe("opt-out detection", () => {
  it("respects do-not-contact language", () => {
    const result = analyzeWithRules([{ text: "Tidak usah, jangan hubungi saya lagi", isFromMe: false, timestamp: new Date() }]);
    expect(result.leadStatus).toBe("DO_NOT_CONTACT_YET");
    expect(result.recommendation.doNotContactReason).toContain("jangan hubungi");
  });
});
