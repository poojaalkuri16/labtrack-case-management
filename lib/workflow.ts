import { db } from "./db";
import { getCaseById } from "./cases";
import { notifyReady, type Outcome } from "./notify";
import { isIsoDate } from "./dates";
import { isStatus, STATUS_LABEL } from "./types";

export interface StatusResult {
  ref: string;
  label: string;
  notify: Outcome | null; // null when the new status doesn't trigger a notification
}

export async function setStatus(caseId: string, status: unknown): Promise<StatusResult> {
  if (!isStatus(status)) throw new Error("Unknown status.");
  const existing = await getCaseById(caseId);
  if (!existing) throw new Error("Case not found.");
  const client = await db();

  if (existing.status !== status) {
    // ready_at marks the moment the case became ready; it keys notification de-duplication.
    const readyAt = status === "ready" ? new Date().toISOString() : status === "shipped" ? existing.ready_at ?? new Date().toISOString() : null;
    // Atomic transition: "AND status != ?" means that when two requests race (a double-click),
    // only the first one writes. The loser changes nothing, so it cannot overwrite ready_at
    // and start a second de-duplication cycle (which would send a second email).
    await client.execute({
      sql: "UPDATE cases SET status = ?, ready_at = ? WHERE id = ? AND status != ?",
      args: [status, readyAt, caseId, status],
    });
  }
  const notify = status === "ready" ? await notifyReady(caseId) : null;
  return { ref: existing.ref, label: STATUS_LABEL[status], notify };
}

export async function setDueDate(caseId: string, dueDate: unknown) {
  if (!isIsoDate(dueDate)) throw new Error("Due date must be a valid calendar date.");
  const client = await db();
  await client.execute({ sql: "UPDATE cases SET due_date = ? WHERE id = ?", args: [dueDate, caseId] });
}
