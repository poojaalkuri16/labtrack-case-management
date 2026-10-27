import { createClient, type Client } from "@libsql/client";
import { randomBytes, randomUUID } from "node:crypto";
import { addDays, LAB_TZ, todayIn } from "./dates";

/**
 * Storage: libSQL (SQLite). Works with zero config:
 *  - local dev      -> ./local.db
 *  - Vercel, no env -> /tmp/labtrack.db (ephemeral, auto-reseeds; fine for a demo)
 *  - Turso env vars -> persistent, free tier
 */
function dbUrl(): string {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  if (process.env.VERCEL) return "file:/tmp/labtrack.db";
  return "file:local.db";
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS clinics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    country TEXT NOT NULL,
    timezone TEXT NOT NULL
  )`,
  // due_date is TEXT 'YYYY-MM-DD' on purpose: a calendar date, not an instant.
  `CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    ref TEXT NOT NULL UNIQUE,
    patient_ref TEXT NOT NULL,
    clinic_id TEXT NOT NULL REFERENCES clinics(id),
    type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('received','in_progress','quality_check','ready','shipped')),
    due_date TEXT NOT NULL CHECK (due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    ready_at TEXT,
    created_at TEXT NOT NULL,
    public_token TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    kind TEXT NOT NULL,
    cycle TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'email',
    mode TEXT NOT NULL,
    to_email TEXT,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    provider_id TEXT,
    created_at TEXT NOT NULL
  )`,
  // One notification per case per "became ready" moment. Double-clicks and retries cannot double-send.
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_cycle ON notifications(case_id, kind, cycle)`,
  `CREATE INDEX IF NOT EXISTS idx_cases_due ON cases(due_date)`,
];

const g = globalThis as unknown as { __labtrackDb?: Promise<Client> };

export function db(): Promise<Client> {
  if (!g.__labtrackDb) {
    // If start-up fails (network blip, two cold starts seeding at once), don't cache the
    // failure: clear it so the next request tries again instead of erroring until restart.
    g.__labtrackDb = init().catch((e) => {
      g.__labtrackDb = undefined;
      throw e;
    });
  }
  return g.__labtrackDb;
}

export const newId = () => randomUUID();
export const newToken = () => randomBytes(12).toString("base64url");

async function init(): Promise<Client> {
  const client = createClient({ url: dbUrl(), authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  await client.batch(SCHEMA.map((sql) => ({ sql, args: [] })), "write");
  const { rows } = await client.execute("SELECT COUNT(*) AS n FROM clinics");
  if (Number(rows[0].n) === 0) await seed(client);
  return client;
}

/** Delete everything and reload the sample data (demo only). */
export async function resetDemoData(): Promise<void> {
  const client = await db();
  await client.batch(
    ["DELETE FROM notifications", "DELETE FROM cases", "DELETE FROM clinics"].map((sql) => ({ sql, args: [] })),
    "write",
  );
  await seed(client);
}

async function seed(client: Client) {
  const today = todayIn(LAB_TZ);
  const clinics = [
    ["northgate", "Northgate Dental Group", "frontdesk@northgate.example.test", "United Kingdom", "Europe/London"],
    ["harbour", "Smile Harbour Dental", "lab@smileharbour.example.test", "Australia", "Australia/Sydney"],
    ["cedar", "Cedar & Pine Orthodontics", "cases@cedarpine.example.test", "Canada", "America/Toronto"],
    ["alba", "Clínica Dental Alba", "laboratorio@alba.example.test", "Spain", "Europe/Madrid"],
    ["pacific", "Pacific Crest Dental", "orders@pacificcrest.example.test", "United States", "America/Los_Angeles"],
  ];
  // [ref, patient, clinic, type, status, due offset in days from lab-today]
  const cases: [string, string, string, string, string, number][] = [
    ["LT-1041", "P-4821", "northgate", "Zirconia crown", "in_progress", -2],
    ["LT-1042", "P-5530", "harbour", "3-unit porcelain bridge", "quality_check", 0],
    ["LT-1043", "P-2207", "cedar", "Implant abutment", "in_progress", 1],
    ["LT-1044", "P-7714", "alba", "Night guard", "received", 1],
    ["LT-1045", "P-3382", "pacific", "Veneer set (6 units)", "in_progress", 2],
    ["LT-1046", "P-6019", "northgate", "Full upper denture", "received", 3],
    ["LT-1047", "P-1148", "harbour", "Inlay", "quality_check", 4],
    ["LT-1048", "P-9403", "pacific", "Zirconia crown", "received", 5],
    ["LT-1049", "P-8826", "cedar", "Surgical guide", "received", 7],
    ["LT-1038", "P-4410", "alba", "Zirconia crown", "ready", -1],
    ["LT-1039", "P-5072", "northgate", "Porcelain bridge", "ready", 0],
    ["LT-1036", "P-3095", "pacific", "Night guard", "shipped", -3],
    ["LT-1037", "P-2688", "harbour", "Veneer", "shipped", -2],
  ];
  const now = new Date();
  const stmts = [
    ...clinics.map(([id, name, email, country, tz]) => ({
      sql: "INSERT OR IGNORE INTO clinics (id,name,email,country,timezone) VALUES (?,?,?,?,?)",
      args: [id, name, email, country, tz],
    })),
    ...cases.map(([ref, patient, clinic, type, status, offset], i) => ({
      sql: `INSERT OR IGNORE INTO cases (id,ref,patient_ref,clinic_id,type,status,due_date,ready_at,created_at,public_token)
            VALUES (?,?,?,?,?,?,?,?,?,?)`,
      args: [
        newId(), ref, patient, clinic, type, status, addDays(today, offset),
        status === "ready" || status === "shipped" ? new Date(now.getTime() - (i + 1) * 3_600_000).toISOString() : null,
        new Date(now.getTime() - (i + 3) * 86_400_000).toISOString(),
        newToken(),
      ],
    })),
  ];
  await client.batch(stmts, "write");
}
