import { describe, expect, it } from "vitest";
import {
  addDays, diffDays, dueLabel, dueState, formatDate, isIsoDate, legacyDisplayDate, todayIn,
} from "../lib/dates";

const ZONES = [
  "Pacific/Honolulu", "America/Los_Angeles", "America/New_York", "America/Sao_Paulo",
  "UTC", "Europe/London", "Europe/Berlin", "Asia/Kolkata", "Asia/Tokyo",
  "Australia/Sydney", "Pacific/Auckland", "Pacific/Kiritimati",
];

describe("the bug being fixed", () => {
  it("legacy rendering shifts the date for clinics west of UTC", () => {
    expect(legacyDisplayDate("2026-11-14", "America/Los_Angeles")).toBe("2026-11-13");
    expect(legacyDisplayDate("2026-11-14", "America/New_York")).toBe("2026-11-13");
    expect(legacyDisplayDate("2026-11-14", "Europe/Berlin")).toBe("2026-11-14");
  });

  it("calendar-date rendering is identical in every timezone", () => {
    const original = process.env.TZ;
    for (const tz of ZONES) {
      process.env.TZ = tz; // Node re-reads TZ at runtime, so this simulates a server/browser in that zone
      expect(formatDate("2026-11-14")).toBe("Sat 14 Nov");
      expect(addDays("2026-11-14", 1)).toBe("2026-11-15");
      expect(diffDays("2026-11-14", "2026-11-20")).toBe(6);
    }
    // `process.env.TZ = undefined` would set the string "undefined", so delete when it was unset.
    if (original === undefined) delete process.env.TZ; else process.env.TZ = original;
  });

  it("every day of 2026-2028 round-trips through add/diff/format in every timezone", () => {
    const original = process.env.TZ;
    const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (const tz of ZONES) {
      process.env.TZ = tz;
      let day = "2026-01-01";
      for (let i = 0; i < 365 + 365 + 366; i++) { // 2028 is a leap year
        const next = addDays(day, 1);
        expect(diffDays(day, next)).toBe(1);
        expect(isIsoDate(next)).toBe(true);
        // weekday must agree with an independent UTC calculation
        const [y, m, d] = day.split("-").map(Number);
        expect(formatDate(day).startsWith(NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()])).toBe(true);
        day = next;
      }
      expect(day).toBe("2029-01-01");
    }
    if (original === undefined) delete process.env.TZ; else process.env.TZ = original;
  });
});

describe("calendar math", () => {
  it("validates real dates only", () => {
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("14/11/2026")).toBe(false);
    expect(isIsoDate(new Date())).toBe(false);
  });

  it("adds days across month, year and leap boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("diffDays ignores DST changes", () => {
    expect(diffDays("2026-03-28", "2026-03-30")).toBe(2); // EU clocks change 29 Mar
    expect(diffDays("2026-10-24", "2026-10-26")).toBe(2);
  });

  it("formats weekday correctly", () => {
    expect(formatDate("2026-11-14")).toBe("Sat 14 Nov");
    expect(formatDate("2026-11-14", { weekday: false, year: true })).toBe("14 Nov 2026");
  });
});

describe("today is decided by the lab's timezone", () => {
  it("flips at lab midnight, including across a DST change", () => {
    // Berlin leaves summer time on 2026-10-25 (02:00 -> 01:00)
    expect(todayIn("Europe/Berlin", new Date("2026-10-24T21:59:59Z"))).toBe("2026-10-24"); // 23:59:59 CEST
    expect(todayIn("Europe/Berlin", new Date("2026-10-24T22:00:00Z"))).toBe("2026-10-25"); // 00:00:00 CEST
    expect(todayIn("Europe/Berlin", new Date("2026-10-25T22:59:59Z"))).toBe("2026-10-25"); // 23:59:59 CET
    expect(todayIn("Europe/Berlin", new Date("2026-10-25T23:00:00Z"))).toBe("2026-10-26"); // 00:00:00 CET
  });

  const instant = new Date("2026-11-13T23:30:00Z");
  it("same instant, different calendar day", () => {
    expect(todayIn("Europe/Berlin", instant)).toBe("2026-11-14");
    expect(todayIn("America/Los_Angeles", instant)).toBe("2026-11-13");
  });
  it("overdue state is stable regardless of viewer", () => {
    const today = todayIn("Europe/Berlin", instant);
    expect(dueState("2026-11-14", today)).toBe("today");
    expect(dueState("2026-11-13", today)).toBe("overdue");
    expect(dueLabel("2026-11-12", today)).toBe("2 days overdue");
    expect(dueLabel("2026-11-15", today)).toBe("Due tomorrow");
  });
});
