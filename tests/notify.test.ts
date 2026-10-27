import { beforeAll, describe, expect, it } from "vitest";
import { rmSync } from "node:fs";

// Isolated database for this test file; no email key => test mode.
const FILE = `/tmp/labtrack-test-${process.pid}.db`;
process.env.TURSO_DATABASE_URL = `file:${FILE}`;
delete process.env.RESEND_API_KEY;

import { createCase, listCases, listNotifications } from "../lib/cases";
import { setStatus } from "../lib/workflow";
import { buildReadyMessage, retryNotification } from "../lib/notify";

beforeAll(() => { try { rmSync(FILE); } catch {} });

async function freshCase() {
  const ref = await createCase({ clinicId: "pacific", type: "Zirconia crown", patientRef: "P-0001", dueDate: "2026-11-14" });
  return (await listCases()).find((c) => c.ref === ref)!;
}

describe("notify clinic when ready", () => {
  it("sends exactly one email when a case becomes ready", async () => {
    const c = await freshCase();
    expect((await setStatus(c.id, "ready")).notify).toBe("test");
    expect((await setStatus(c.id, "ready")).notify).toBe("skipped"); // double click
    const mine = (await listNotifications()).filter((n) => n.case_id === c.id);
    expect(mine).toHaveLength(1);
    expect(mine[0].status).toBe("test");
  });

  it("does not email for other statuses", async () => {
    const c = await freshCase();
    expect((await setStatus(c.id, "in_progress")).notify).toBeNull();
    expect((await listNotifications()).filter((n) => n.case_id === c.id)).toHaveLength(0);
  });

  it("emails again only if the case is reopened and becomes ready again", async () => {
    const c = await freshCase();
    await setStatus(c.id, "ready");
    await setStatus(c.id, "quality_check");
    await new Promise((r) => setTimeout(r, 5));
    expect((await setStatus(c.id, "ready")).notify).toBe("test");
    expect((await listNotifications()).filter((n) => n.case_id === c.id)).toHaveLength(2);
  });

  it("moving ready -> shipped does not re-notify", async () => {
    const c = await freshCase();
    await setStatus(c.id, "ready");
    expect((await setStatus(c.id, "shipped")).notify).toBeNull();
    expect((await listNotifications()).filter((n) => n.case_id === c.id)).toHaveLength(1);
  });

  it("the email shows the same due date to every clinic and no patient data", async () => {
    const c = await freshCase();
    const m = buildReadyMessage(c);
    expect(m.text).toContain("Sat 14 Nov 2026");
    expect(m.text).not.toContain("P-0001");
    expect(m.subject).toBe(`Case ${c.ref} is ready`);
  });

  it("retry only applies to failed notifications", async () => {
    const c = await freshCase();
    await setStatus(c.id, "ready");
    const n = (await listNotifications()).find((x) => x.case_id === c.id)!;
    expect(await retryNotification(n.id)).toBe("skipped");
  });

  it("rejects impossible due dates and unknown statuses", async () => {
    await expect(createCase({ clinicId: "pacific", type: "x", patientRef: "y", dueDate: "2026-02-30" })).rejects.toThrow();
    const c = await freshCase();
    await expect(setStatus(c.id, "banana")).rejects.toThrow();
  });
});
