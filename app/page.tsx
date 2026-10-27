import Link from "next/link";
import { listCases } from "@/lib/cases";
import { addDays, dueLabel, dueState, formatDate, LAB_TZ, todayIn } from "@/lib/dates";
import { STATUSES, STATUS_LABEL, type CaseRow, type Status } from "@/lib/types";
import { dueOn, isLate, isShipped } from "@/lib/dashboard";
import { StatusTrack } from "@/components/StatusTrack";
import { Flash } from "@/components/Flash";
import { changeStatus, resetDemo } from "./actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

const NEXT: Partial<Record<Status, { to: Status; label: string }>> = {
  received: { to: "in_progress", label: "Start production" },
  in_progress: { to: "quality_check", label: "Send to QC" },
  quality_check: { to: "ready", label: "Mark ready" },
  ready: { to: "shipped", label: "Mark shipped" },
};


export default async function Dashboard({ searchParams: searchParamsPromise }: { searchParams: Promise<SP> }) {
  const searchParams = await searchParamsPromise; // Next 15+: searchParams is a Promise
  const all = await listCases();
  const today = todayIn(LAB_TZ);
  const f = searchParams.f ?? "active";
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const day = searchParams.day;

  const overdue = all.filter((c) => isLate(c, today));
  const counts = {
    active: all.filter((c) => c.status !== "shipped").length,
    overdue: overdue.length,
    ready: all.filter((c) => c.status === "ready").length,
    shipped: all.filter((c) => c.status === "shipped").length,
  };

  let rows = all.filter((c) => {
    if (f === "active") return c.status !== "shipped";
    if (f === "overdue") return isLate(c, today);
    if (f === "ready") return c.status === "ready";
    if (f === "shipped") return c.status === "shipped";
    return true;
  });
  if (day) rows = rows.filter((c) => !isShipped(c) && c.due_date === day);
  if (q) {
    rows = rows.filter((c) =>
      [c.ref, c.clinic_name, c.type, c.patient_ref].some((v) => v.toLowerCase().includes(q)),
    );
  }
  rows = [...rows].sort((a, b) =>
    f === "shipped" ? b.due_date.localeCompare(a.due_date) : a.due_date.localeCompare(b.due_date) || a.ref.localeCompare(b.ref),
  );

  const rail = [
    { key: "overdue", label: "Overdue", count: overdue.length, href: "/?f=overdue", late: true },
    ...Array.from({ length: 6 }, (_, i) => {
      const d = addDays(today, i);
      return {
        key: d,
        label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : formatDate(d).split(" ")[0],
        sub: formatDate(d, { weekday: false }),
        count: dueOn(all, d),
        href: `/?day=${d}`,
        late: false,
      };
    }),
  ];

  const returnQuery = new URLSearchParams(
    Object.entries(searchParams).filter(([k, v]) => v && !["n", "ref", "s", "err"].includes(k)) as [string, string][],
  ).toString();

  const chips: { id: string; label: string; n: number }[] = [
    { id: "active", label: "Active", n: counts.active },
    { id: "overdue", label: "Overdue", n: counts.overdue },
    { id: "ready", label: "Ready to dispatch", n: counts.ready },
    { id: "shipped", label: "Shipped", n: counts.shipped },
  ];

  return (
    <div>
      <Flash n={searchParams.n} caseRef={searchParams.ref} s={searchParams.s} err={searchParams.err} />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Cases</h1>
          <p className="mt-1 text-sm text-ink/70">
            Today is {formatDate(today, { year: true })} in {LAB_TZ.replace("_", " ")}.
            {overdue.length > 0 ? ` ${overdue.length} ${overdue.length === 1 ? "case needs" : "cases need"} attention.` : " Nothing is overdue."}
          </p>
        </div>
        <Link href="/cases/new" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/90">
          New case
        </Link>
      </div>

      {/* Due-date rail: the one thing on this page that is allowed to be loud */}
      <section aria-label="Cases due in the next days" className="mb-6 overflow-hidden rounded-xl border border-line bg-white">
        <div className="grid grid-cols-2 divide-line sm:grid-cols-4 md:grid-cols-7 md:divide-x">
          {rail.map((r) => {
            const active = day === r.key || (r.key === "overdue" && f === "overdue" && !day);
            return (
              <Link
                key={r.key}
                href={r.href}
                aria-current={active ? "true" : undefined}
                className={`block border-b border-line px-4 py-3 transition-colors md:border-b-0 ${active ? "bg-ink text-white" : "hover:bg-porcelain"}`}
              >
                <span className={`block text-xs font-medium ${active ? "text-white/70" : r.late ? "text-late" : "text-ink/60"}`}>
                  {r.label}
                  {"sub" in r && r.sub ? <span className="ml-1 font-normal opacity-80">{r.sub}</span> : null}
                </span>
                <span className={`font-display text-2xl font-semibold ${!active && r.late && r.count > 0 ? "text-late" : ""}`}>
                  {r.count}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter cases">
          {chips.map((c) => {
            const on = !day && f === c.id;
            return (
              <Link
                key={c.id}
                href={`/?f=${c.id}`}
                aria-current={on ? "true" : undefined}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink/80 hover:border-ink/40"
                }`}
              >
                {c.label} <span className={on ? "text-white/70" : "text-ink/50"}>{c.n}</span>
              </Link>
            );
          })}
          {day && (
            <Link href="/" className="rounded-full border border-brand bg-brand-soft px-3 py-1 text-sm font-medium text-brand">
              Due {formatDate(day)} ✕
            </Link>
          )}
        </div>
        <form action="/" className="flex gap-2">
          {f !== "active" && <input type="hidden" name="f" value={f} />}
          <label className="sr-only" htmlFor="q">Search cases</label>
          <input
            id="q" name="q" defaultValue={searchParams.q ?? ""} placeholder="Search case, clinic, type"
            className="w-60 rounded-lg border border-line bg-white px-3 py-1.5 text-sm placeholder:text-ink/40"
          />
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="hidden grid-cols-[84px_1.2fr_1.1fr_140px_140px_200px] gap-4 border-b border-line bg-porcelain px-5 py-2.5 text-xs font-medium text-ink/60 md:grid">
          <span>Case</span><span>Clinic</span><span>Work</span><span>Progress</span><span>Due</span><span className="text-right">Next step</span>
        </div>
        {rows.length === 0 && (
          <div className="px-5 py-14 text-center text-sm text-ink/70">
            No cases match.{" "}
            <Link href="/" className="font-semibold text-brand underline">Clear filters</Link> or{" "}
            <Link href="/cases/new" className="font-semibold text-brand underline">add a case</Link>.
          </div>
        )}
        <ul className="divide-y divide-line">
          {rows.map((c) => (
            <CaseLine key={c.id} c={c} today={today} returnQuery={returnQuery} />
          ))}
        </ul>
      </div>

      {process.env.DEMO_RESET !== "off" && (
        <details className="mt-6 text-sm text-ink/70">
          <summary className="cursor-pointer select-none underline-offset-2 hover:underline">Reset demo data</summary>
          <form action={resetDemo} className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-3">
            <span>This deletes every case and email and loads fresh sample data, so you can run the demo again from the start.</span>
            <button className="rounded-lg bg-ink px-3 py-1.5 font-semibold text-white">Yes, reset</button>
          </form>
        </details>
      )}
    </div>
  );
}

function CaseLine({ c, today, returnQuery }: { c: CaseRow; today: string; returnQuery: string }) {
  const open = !isShipped(c);
  const state = open ? dueState(c.due_date, today) : "later";
  const dueTone = state === "overdue" ? "text-late" : state === "today" ? "text-warn" : "text-ink";
  const next = NEXT[c.status];
  const others = STATUSES.filter((s) => s !== c.status && s !== next?.to);

  return (
    <li className="grid gap-x-4 gap-y-3 px-5 py-4 md:grid-cols-[84px_1.2fr_1.1fr_140px_140px_200px] md:items-center">
      <div>
        <Link href={`/track/${c.public_token}`} className="font-display text-sm font-semibold underline-offset-2 hover:underline">
          {c.ref}
        </Link>
      </div>
      <div>
        <p className="text-sm font-medium">{c.clinic_name}</p>
        <p className="text-xs text-ink/60">{c.clinic_country}</p>
      </div>
      <div>
        <p className="text-sm">{c.type}</p>
        <p className="text-xs text-ink/60">Patient {c.patient_ref}</p>
      </div>
      <StatusTrack status={c.status} />
      <div>
        <p className={`text-sm font-semibold ${dueTone}`}>{formatDate(c.due_date)}</p>
        <p className={`text-xs ${open ? dueTone : "text-ink/60"}`}>{!open ? "Delivered" : c.status === "ready" ? (state === "overdue" ? `${dueLabel(c.due_date, today)} · ship now` : "Ready to ship") : dueLabel(c.due_date, today)}</p>
      </div>
      <div className="flex items-center justify-start gap-2 md:justify-end">
        {next && (
          <form action={changeStatus}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="status" value={next.to} />
            <input type="hidden" name="returnTo" value="/" />
            <input type="hidden" name="returnQuery" value={returnQuery} />
            <button
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                next.to === "ready" ? "bg-ready text-white hover:bg-ready/90" : "border border-line bg-white hover:border-ink/40"
              }`}
              title={next.to === "ready" ? "Emails the clinic that this case is ready" : undefined}
            >
              {next.label}
            </button>
          </form>
        )}
        <details className="relative">
          <summary aria-label={`More actions for ${c.ref}`} className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-ink/70 hover:border-ink/40">
            ⋯
          </summary>
          <div className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-line bg-white p-2 shadow-lg">
            <p className="px-2 pb-1 text-xs font-medium text-ink/60">Set status</p>
            {others.map((s) => (
              <form key={s} action={changeStatus}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="status" value={s} />
                <input type="hidden" name="returnTo" value="/" />
                <input type="hidden" name="returnQuery" value={returnQuery} />
                <button className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-porcelain">{STATUS_LABEL[s]}</button>
              </form>
            ))}
          </div>
        </details>
      </div>
    </li>
  );
}
