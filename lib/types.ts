export const STATUSES = ["received", "in_progress", "quality_check", "ready", "shipped"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  received: "Received",
  in_progress: "In production",
  quality_check: "Quality check",
  ready: "Ready",
  shipped: "Shipped",
};

export function isStatus(s: unknown): s is Status {
  return typeof s === "string" && (STATUSES as readonly string[]).includes(s);
}

export interface CaseRow {
  id: string;
  ref: string;
  patient_ref: string;
  type: string;
  status: Status;
  /** Calendar date, "YYYY-MM-DD". Never a timestamp. */
  due_date: string;
  ready_at: string | null;
  created_at: string;
  public_token: string;
  clinic_id: string;
  clinic_name: string;
  clinic_email: string | null;
  clinic_tz: string;
  clinic_country: string;
}

export interface Clinic {
  id: string;
  name: string;
  email: string | null;
  country: string;
  timezone: string;
}

export interface NotificationRow {
  id: string;
  case_id: string;
  case_ref: string;
  kind: string;
  channel: string;
  mode: "live" | "test";
  to_email: string | null;
  subject: string;
  body_text: string;
  status: "pending" | "sent" | "test" | "failed";
  error: string | null;
  provider_id: string | null;
  created_at: string;
}
