/**
 * Due dates are CALENDAR DATES ("2026-11-14"), not instants.
 *
 * The classic bug: storing a due date as a timestamp (or parsing "2026-11-14" with
 * `new Date(...)`, which means midnight UTC) and then formatting it in the viewer's
 * timezone. A clinic in Los Angeles then sees the 13th.
 *
 * The fix: keep the value as a plain "YYYY-MM-DD" string end to end and do all
 * arithmetic/formatting on its components. Only "what is today?" needs a timezone,
 * and that is always the LAB's timezone.
 */

export const LAB_TZ = process.env.LAB_TIMEZONE || "Europe/Berlin";

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = ISO.exec(s);
  if (!m) return false;
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function toUtc(iso: string): Date {
  if (!isIsoDate(iso)) throw new Error(`Invalid calendar date: ${iso}`);
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(dt: Date): string {
  const y = String(dt.getUTCFullYear()).padStart(4, "0");
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, n: number): string {
  const dt = toUtc(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUtc(dt);
}

/** Whole days from a to b (b - a). Pure calendar math, immune to DST. */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** The calendar date it is right now (or at `now`) in the given IANA timezone. */
export function todayIn(tz: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "Fri 14 Nov" (or "Fri 14 Nov 2026"). Deterministic: no Intl, no timezone. */
export function formatDate(iso: string, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const { weekday = true, year = false } = opts;
  const dt = toUtc(iso);
  const core = `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`;
  return [weekday ? DAYS[dt.getUTCDay()] : null, core, year ? dt.getUTCFullYear() : null]
    .filter(Boolean)
    .join(" ");
}

export type DueState = "overdue" | "today" | "soon" | "later";

export function dueState(due: string, today: string): DueState {
  const d = diffDays(today, due);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 2) return "soon";
  return "later";
}

export function dueLabel(due: string, today: string): string {
  const d = diffDays(today, due);
  if (d < -1) return `${-d} days overdue`;
  if (d === -1) return "1 day overdue";
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `In ${d} days`;
}

/**
 * What the OLD behaviour did, kept only so the app can demonstrate the bug:
 * treat the date as midnight UTC, then read the calendar date in the viewer's timezone.
 */
export function legacyDisplayDate(iso: string, viewerTz: string): string {
  return todayIn(viewerTz, new Date(`${iso}T00:00:00Z`));
}
