import { describe, expect, it } from "vitest";
import { rmSync } from "node:fs";

const FILE = `/tmp/labtrack-reset-${process.pid}.db`;
try { rmSync(FILE); } catch {}
process.env.TURSO_DATABASE_URL = `file:${FILE}`;
delete process.env.RESEND_API_KEY;

import { resetDemoData } from "../lib/db";
import { createCase, listCases, listClinics, listNotifications } from "../lib/cases";
import { setStatus } from "../lib/workflow";
import { isLate } from "../lib/dashboard";
import { LAB_TZ, todayIn } from "../lib/dates";

describe("demo reset", () => {
  it("removes new cases and emails and restores the sample data", async () => {
    const before = (await listCases()).length;
    const ref = await createCase({ clinicId: "pacific", type: "Crown", patientRef: "P-1", dueDate: "2026-12-01" });
    const c = (await listCases()).find((x) => x.ref === ref)!;
    await setStatus(c.id, "ready");
    expect((await listNotifications()).length).toBe(1);

    await resetDemoData();

    expect((await listNotifications()).length).toBe(0);
    expect((await listCases()).length).toBe(before);
    expect((await listCases()).some((x) => x.ref === ref)).toBe(false);
    expect((await listClinics()).length).toBe(5);
  });

  it("is repeatable and always includes a late case plus a ready-but-late case for the demo", async () => {
    await resetDemoData();
    await resetDemoData();
    const all = await listCases();
    const today = todayIn(LAB_TZ);
    expect(all.length).toBe(13);
    expect(all.some((x) => x.status === "in_progress" && isLate(x, today))).toBe(true);
    expect(all.some((x) => x.status === "ready" && isLate(x, today))).toBe(true);
  });

  it("a reset case can be marked ready and emailed again (demo can be re-run)", async () => {
    await resetDemoData();
    const q = (await listCases()).find((x) => x.status === "quality_check")!;
    expect((await setStatus(q.id, "ready")).notify).toBe("test");
  });
});
