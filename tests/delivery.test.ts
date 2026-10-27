import { afterAll, describe, expect, it } from "vitest";
import { rmSync } from "node:fs";

const FILE = `/tmp/labtrack-delivery-${process.pid}.db`;
try { rmSync(FILE); } catch {}
process.env.TURSO_DATABASE_URL = `file:${FILE}`;
process.env.RESEND_API_KEY = "re_test_key"; // live mode; the provider is faked below, nothing is sent
delete process.env.NOTIFY_MODE;

import { db } from "../lib/db";
import { createCase, listCases, listNotifications } from "../lib/cases";
import { setStatus } from "../lib/workflow";
import { retryNotification } from "../lib/notify";

type Call = { url: string; headers: Record<string, string>; body: any };
const calls: Call[] = [];
const realFetch = globalThis.fetch;
let respond: () => Response = () => new Response(JSON.stringify({ id: "re_123" }), { status: 200 });
globalThis.fetch = (async (url: string, init: any) => {
  calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
  return respond();
}) as typeof fetch;
afterAll(() => { globalThis.fetch = realFetch; });

async function readyCase(clinicId = "pacific") {
  const ref = await createCase({ clinicId, type: "Crown", patientRef: "P-9", dueDate: "2026-11-14" });
  const c = (await listCases()).find((x) => x.ref === ref)!;
  const r = await setStatus(c.id, "ready");
  return { c, r };
}

describe("live email delivery (fake provider)", () => {
  it("sends through the provider with an idempotency key and no patient data", async () => {
    calls.length = 0;
    const { c, r } = await readyCase();
    expect(r.notify).toBe("sent");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect(calls[0].headers["Idempotency-Key"]).toContain(c.id);
    expect(calls[0].body.to[0]).toBe("orders@pacificcrest.example.test");
    expect(JSON.stringify(calls[0].body)).not.toContain("P-9");
    expect((await listNotifications()).find((n) => n.case_id === c.id)!.status).toBe("sent");
  });

  it("a provider failure keeps the case Ready, shows Failed, and Retry succeeds with the same idempotency key", async () => {
    calls.length = 0;
    respond = () => new Response(JSON.stringify({ message: "Rate limited" }), { status: 429 });
    const { c, r } = await readyCase();
    expect(r.notify).toBe("failed");
    expect((await listCases()).find((x) => x.id === c.id)!.status).toBe("ready");
    const n = (await listNotifications()).find((x) => x.case_id === c.id)!;
    expect(n.status).toBe("failed");
    expect(n.error).toBe("Rate limited");

    respond = () => new Response(JSON.stringify({ id: "re_456" }), { status: 200 });
    expect(await retryNotification(n.id)).toBe("sent");
    expect(calls).toHaveLength(2);
    expect(calls[1].headers["Idempotency-Key"]).toBe(calls[0].headers["Idempotency-Key"]);
    const after = (await listNotifications()).find((x) => x.id === n.id)!;
    expect(after.status).toBe("sent");
    expect(after.error).toBeNull();
    expect(await retryNotification(n.id)).toBe("skipped"); // a sent email cannot be retried
  });

  it("a network error is caught, not thrown", async () => {
    const prev = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error("ECONNRESET"); }) as typeof fetch;
    const { r } = await readyCase();
    globalThis.fetch = prev;
    expect(r.notify).toBe("failed");
  });

  it("a clinic with no email address is flagged as failed, not silently skipped", async () => {
    const client = await db();
    await client.execute({
      sql: "INSERT INTO clinics (id,name,email,country,timezone) VALUES ('noemail','No Email Clinic',NULL,'France','Europe/Paris')",
      args: [],
    });
    calls.length = 0;
    const { c, r } = await readyCase("noemail");
    expect(r.notify).toBe("failed");
    expect(calls).toHaveLength(0);
    expect((await listNotifications()).find((n) => n.case_id === c.id)!.error).toContain("no email");
  });
});

describe("database start-up", () => {
  it("recovers after a failed start-up instead of caching the failure", async () => {
    (globalThis as any).__labtrackDb = undefined;
    process.env.TURSO_DATABASE_URL = "file:/nonexistent-dir/x.db";
    await expect(db()).rejects.toThrow();
    process.env.TURSO_DATABASE_URL = `file:${FILE}`;
    expect(await db()).toBeTruthy(); // a healthy URL works on the next call
  });
});
