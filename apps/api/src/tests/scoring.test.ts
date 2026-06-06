import { describe, expect, it } from "vitest";
import { analyzeWithRules } from "../services/analyzer/ruleAnalyzer.js";

describe("scoring", () => {
  it("keeps all scores in 0..100 range", () => {
    const result = analyzeWithRules([
      { text: "Harga berapa? ada stock? bisa kirim? saya ambil satu kalau cocok", isFromMe: false, timestamp: new Date() }
    ]);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    for (const value of Object.values(result.scores)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});
