import { describe, expect, it } from "vitest";
import { parseJsonField, stringifyJsonField } from "../lib/jsonField.js";

describe("MySQL LongText JSON helper", () => {
  it("roundtrips JSON values", () => {
    const value = { tags: ["hot", "invoice"], score: 91 };
    expect(parseJsonField(stringifyJsonField(value), {})).toEqual(value);
  });

  it("returns fallback for invalid JSON", () => {
    expect(parseJsonField("not-json", [])).toEqual([]);
  });
});
