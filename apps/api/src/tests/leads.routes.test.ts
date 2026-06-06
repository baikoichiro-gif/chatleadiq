import { describe, expect, it } from "vitest";
import { leadsRouter } from "../routes/leads.routes.js";

describe("leads routes", () => {
  it("exports an express router for CRM lead endpoints", () => {
    expect(leadsRouter).toBeTruthy();
  });
});
