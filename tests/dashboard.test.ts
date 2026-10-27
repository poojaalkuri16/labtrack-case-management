import { describe, expect, it } from "vitest";
import { dueOn, isLate } from "../lib/dashboard";

const c = (status: string, due_date: string) => ({ status: status as any, due_date });

describe("what counts as late", () => {
  const today = "2026-10-27";
  it("an unfinished case past its due date is late", () => {
    expect(isLate(c("in_progress", "2026-10-25"), today)).toBe(true);
  });
  it("a READY case still in the lab past its due date is late too", () => {
    expect(isLate(c("ready", "2026-10-26"), today)).toBe(true);
  });
  it("a shipped case is never late, however old", () => {
    expect(isLate(c("shipped", "2026-01-01"), today)).toBe(false);
  });
  it("due today or later is not late", () => {
    expect(isLate(c("ready", "2026-10-27"), today)).toBe(false);
    expect(isLate(c("received", "2026-10-28"), today)).toBe(false);
  });
});

describe("due-date strip counts", () => {
  it("counts every not-yet-shipped case due that day, including ready ones", () => {
    const list = [c("ready", "2026-10-27"), c("quality_check", "2026-10-27"), c("shipped", "2026-10-27"), c("received", "2026-10-28")];
    expect(dueOn(list, "2026-10-27")).toBe(2);
  });
});
