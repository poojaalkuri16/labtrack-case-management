import { db, newId } from "./db";
import { getCaseById } from "./cases";
import { formatDate } from "./dates";
import type { CaseRow } from "./types";

export type Outcome = "sent" | "test" | "skipped" | "failed";

function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Privacy: dental cases are health data. The email carries the case reference and
 * type only, never a patient name or patient reference.
 */
export function buildReadyMessage(c: CaseRow) {
  const due = formatDate(c.due_date, { year: true }); // calendar date, identical for every clinic
  const link = `${appUrl()}/track/${c.public_token}`;
  const subject = `Case ${c.ref} is ready`;
  const text = [
    `Hello ${c.clinic_name},`,
    ``,
    `Good news: case ${c.ref} (${c.type}) is finished and ready.`,
    `Original due date: ${due}.`,
    ``,
    `Track it any time: ${link}`,
    ``,
    `Reply to this email if you have questions.`,
    `The lab team`,
  ].join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#0E2A33">
<p>Hello ${esc(c.clinic_name)},</p>
<p>Good news: case <strong>${esc(c.ref)}</strong> (${esc(c.type)}) is finished and ready.</p>
<p>Original due date: <strong>${esc(due)}</strong>.</p>
<p><a href="${link}">Track this case</a></p>
<p style="color:#5b6f75">Reply to this email if you have questions.<br>The lab team</p></div>`;
  return { subject, text, html };
}

type Delivery = { mode: "live" | "test"; ok: boolean; providerId?: string; error?: string };

async function deliver(to: string, msg: ReturnType<typeof buildReadyMessage>, idempotencyKey: string): Promise<Delivery> {
  const key = process.env.RESEND_API_KEY;
  if (!key || process.env.NOTIFY_MODE === "test") return { mode: "test", ok: true };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || "LabTrack <onboarding@resend.dev>",
        to: [to], subject: msg.subject, text: msg.text, html: msg.html,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { mode: "live", ok: false, error: body.message || `Email provider returned HTTP ${res.status}` };
    return { mode: "live", ok: true, providerId: body.id };
  } catch (e) {
    return { mode: "live", ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

/**
 * Called when a case becomes "ready". Safe to call repeatedly: the unique index on
 * (case_id, kind, cycle) means a given "became ready" moment can produce at most one email.
 * Never throws: a failed email must not roll back the status change; it shows up in the Outbox to retry.
 */
export async function notifyReady(caseId: string): Promise<Outcome> {
  const c = await getCaseById(caseId);
  if (!c || c.status !== "ready" || !c.ready_at) return "skipped";
  const client = await db();
  const msg = buildReadyMessage(c);
  const id = newId();

  const claim = await client.execute({
    sql: `INSERT OR IGNORE INTO notifications
          (id,case_id,kind,cycle,channel,mode,to_email,subject,body_text,status,created_at)
          VALUES (?,?, 'ready', ?, 'email', 'test', ?, ?, ?, 'pending', ?)`,
    args: [id, c.id, c.ready_at, c.clinic_email, msg.subject, msg.text, new Date().toISOString()],
  });
  if (claim.rowsAffected === 0) return "skipped"; // already notified for this ready moment

  if (!c.clinic_email) {
    await finish(id, { mode: "test", ok: false, error: "This clinic has no email address on file." });
    return "failed";
  }
  const d = await deliver(c.clinic_email, msg, `ready-${c.id}-${c.ready_at}`);
  await finish(id, d);
  return d.ok ? (d.mode === "live" ? "sent" : "test") : "failed";
}

/** Retry a failed notification from the Outbox. */
export async function retryNotification(notificationId: string): Promise<Outcome> {
  const client = await db();
  const { rows } = await client.execute({ sql: "SELECT * FROM notifications WHERE id = ?", args: [notificationId] });
  const n = rows[0];
  if (!n || String(n.status) !== "failed") return "skipped";
  const c = await getCaseById(String(n.case_id));
  if (!c || !c.clinic_email) return "failed";
  const msg = buildReadyMessage(c);
  const d = await deliver(c.clinic_email, msg, `ready-${c.id}-${String(n.cycle)}`);
  await client.execute({
    sql: "UPDATE notifications SET to_email = ?, subject = ?, body_text = ? WHERE id = ?",
    args: [c.clinic_email, msg.subject, msg.text, notificationId],
  });
  await finish(notificationId, d);
  return d.ok ? (d.mode === "live" ? "sent" : "test") : "failed";
}

async function finish(id: string, d: Delivery) {
  const client = await db();
  await client.execute({
    sql: "UPDATE notifications SET status = ?, mode = ?, error = ?, provider_id = ? WHERE id = ?",
    args: [d.ok ? (d.mode === "live" ? "sent" : "test") : "failed", d.mode, d.error ?? null, d.providerId ?? null, id],
  });
}
