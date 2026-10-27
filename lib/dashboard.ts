import type { CaseRow } from "./types";

/**
 * A case still needs the lab's attention until it has shipped. "Ready" is not "done":
 * a ready case that is sitting in the lab past its due date is late, so it counts too.
 */
export const isShipped = (c: Pick<CaseRow, "status">) => c.status === "shipped";

export function isLate(c: Pick<CaseRow, "status" | "due_date">, today: string): boolean {
  return !isShipped(c) && c.due_date < today;
}

/** Cases that are not yet shipped and fall due on a given calendar day. */
export function dueOn(cases: Pick<CaseRow, "status" | "due_date">[], day: string): number {
  return cases.filter((c) => !isShipped(c) && c.due_date === day).length;
}
