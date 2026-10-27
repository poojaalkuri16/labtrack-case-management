import type { Row } from "@libsql/client";
import { db, newId, newToken } from "./db";
import { isIsoDate } from "./dates";
import type { CaseRow, Clinic, NotificationRow, Status } from "./types";

const SELECT_CASE = `
  SELECT c.*, cl.name AS clinic_name, cl.email AS clinic_email,
         cl.timezone AS clinic_tz, cl.country AS clinic_country
  FROM cases c JOIN clinics cl ON cl.id = c.clinic_id`;

const s = (v: unknown) => (v == null ? null : String(v));

function toCase(r: Row): CaseRow {
  return {
    id: String(r.id), ref: String(r.ref), patient_ref: String(r.patient_ref), type: String(r.type),
    status: String(r.status) as Status, due_date: String(r.due_date), ready_at: s(r.ready_at),
    created_at: String(r.created_at), public_token: String(r.public_token),
    clinic_id: String(r.clinic_id), clinic_name: String(r.clinic_name), clinic_email: s(r.clinic_email),
    clinic_tz: String(r.clinic_tz), clinic_country: String(r.clinic_country),
  };
}

export async function listCases(): Promise<CaseRow[]> {
  const c = await db();
  const { rows } = await c.execute(`${SELECT_CASE} ORDER BY c.due_date ASC, c.ref ASC`);
  return rows.map(toCase);
}

export async function getCaseById(id: string): Promise<CaseRow | null> {
  const c = await db();
  const { rows } = await c.execute({ sql: `${SELECT_CASE} WHERE c.id = ?`, args: [id] });
  return rows[0] ? toCase(rows[0]) : null;
}

export async function getCaseByToken(token: string): Promise<CaseRow | null> {
  const c = await db();
  const { rows } = await c.execute({ sql: `${SELECT_CASE} WHERE c.public_token = ?`, args: [token] });
  return rows[0] ? toCase(rows[0]) : null;
}

export async function listClinics(): Promise<Clinic[]> {
  const c = await db();
  const { rows } = await c.execute("SELECT * FROM clinics ORDER BY name");
  return rows.map((r) => ({
    id: String(r.id), name: String(r.name), email: s(r.email), country: String(r.country), timezone: String(r.timezone),
  }));
}

export async function createCase(input: { clinicId: string; type: string; patientRef: string; dueDate: string }) {
  if (!isIsoDate(input.dueDate)) throw new Error("Due date must be a valid calendar date.");
  const type = input.type.trim();
  const patientRef = input.patientRef.trim();
  if (!type || !patientRef) throw new Error("Case type and patient reference are required.");
  const c = await db();
  const { rows } = await c.execute("SELECT COALESCE(MAX(CAST(SUBSTR(ref,4) AS INTEGER)), 1000) + 1 AS next FROM cases");
  const ref = `LT-${rows[0].next}`;
  await c.execute({
    sql: `INSERT INTO cases (id,ref,patient_ref,clinic_id,type,status,due_date,ready_at,created_at,public_token)
          VALUES (?,?,?,?,?,'received',?,NULL,?,?)`,
    args: [newId(), ref, patientRef, input.clinicId, type, input.dueDate, new Date().toISOString(), newToken()],
  });
  return ref;
}

export async function listNotifications(): Promise<NotificationRow[]> {
  const c = await db();
  const { rows } = await c.execute(`
    SELECT n.*, c.ref AS case_ref FROM notifications n JOIN cases c ON c.id = n.case_id
    ORDER BY n.created_at DESC LIMIT 100`);
  return rows.map((r) => ({
    id: String(r.id), case_id: String(r.case_id), case_ref: String(r.case_ref), kind: String(r.kind),
    channel: String(r.channel), mode: String(r.mode) as "live" | "test", to_email: s(r.to_email),
    subject: String(r.subject), body_text: String(r.body_text), status: String(r.status) as NotificationRow["status"],
    error: s(r.error), provider_id: s(r.provider_id), created_at: String(r.created_at),
  }));
}
