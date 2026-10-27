import { describe, expect, it } from "vitest";
import { rmSync } from "node:fs";

const FILE = `/tmp/labtrack-concurrency-${process.pid}.db`;
try { rmSync(FILE); } catch {}
process.env.TURSO_DATABASE_URL = `file:${FILE}`;
delete process.env.RESEND_API_KEY;

import { db } from "../lib/db";
import { createCase, listCases, listNotifications } from "../lib/cases";
import { setStatus } from "../lib/workflow";

/**
 * A local SQLite file answers in microseconds, so two "simultaneous" requests never really
 * overlap. A hosted database (Turso on Vercel) answers in tens of milliseconds, which is when
 * a double-click used to send two emails. This test adds that latency to the client so the
 * overlap actually happens.
 */
async function addLatency(maxMs: number) {
  const client = await db();
  const original = client.execute.bind(client);
  (client as any).execute = async (stmt: any) => {
    await new Promise((r) => setTimeout(r, Math.random() * maxMs));
    return original(stmt);
  };
  return () => { (client as any).execute = original; };
}

describe("double-click on Mark ready under realistic database latency", () => {
  it("sends exactly one email even when two requests overlap", async () => {
    const restore = await addLatency(15);
    try {
      let duplicates = 0;
      for (let i = 0; i < 40; i++) {
        const ref = await createCase({ clinicId: "pacific", type: "Crown", patientRef: "P-1", dueDate: "2026-11-14" });
        const c = (await listCases()).find((x) => x.ref === ref)!;
        await setStatus(c.id, "quality_check");
        await Promise.all([setStatus(c.id, "ready"), setStatus(c.id, "ready")]);
        const sent = (await listNotifications()).filter((n) => n.case_id === c.id).length;
        if (sent !== 1) duplicates++;
      }
      expect(duplicates).toBe(0);
    } finally {
      restore();
    }
  }, 120_000);
});
