import { addDays, formatDate, isIsoDate, LAB_TZ, legacyDisplayDate, todayIn } from "@/lib/dates";

export const dynamic = "force-dynamic";

const ZONES: [string, string][] = [
  [LAB_TZ, "Lab"],
  ["Europe/London", "United Kingdom"],
  ["America/New_York", "US East"],
  ["America/Toronto", "Canada"],
  ["America/Los_Angeles", "US West"],
  ["Pacific/Honolulu", "Hawaii"],
  ["Asia/Kolkata", "India"],
  ["Australia/Sydney", "Australia"],
  ["Pacific/Auckland", "New Zealand"],
];

export default async function Check({ searchParams: searchParamsPromise }: { searchParams: Promise<{ d?: string }> }) {
  const searchParams = await searchParamsPromise;
  const due = isIsoDate(searchParams.d) ? searchParams.d : addDays(todayIn(LAB_TZ), 3);
  const rows = ZONES.map(([tz, label]) => {
    const before = legacyDisplayDate(due, tz);
    return { tz, label, before, off: before !== due };
  });
  const broken = rows.filter((r) => r.off).length;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Why clinics saw the wrong due date</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink/80">
        A due date is a day on the calendar, not a moment in time. The old version saved it as a timestamp, so each
        clinic’s browser converted it into their own timezone. For clinics west of Greenwich, midnight on the 14th became the
        evening of the 13th. Now the date is stored and shown as plain text, <code className="rounded bg-ink/5 px-1.5 py-0.5 text-[13px]">{due}</code>,
        and only the lab’s timezone decides what “today” and “overdue” mean.
      </p>

      <form className="mt-6 flex items-end gap-3">
        <label className="text-sm font-medium">
          Try another due date
          <input type="date" name="d" defaultValue={due} className="mt-1.5 block rounded-lg border border-line bg-white px-3 py-2 text-sm" />
        </label>
        <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Check</button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-porcelain text-xs font-medium text-ink/60">
            <tr><th className="px-5 py-2.5">Clinic location</th><th className="px-5 py-2.5">Before the fix</th><th className="px-5 py-2.5">Now</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.tz}>
                <td className="px-5 py-3">
                  <span className="font-medium">{r.label}</span>
                  <span className="block text-xs text-ink/60">{r.tz.replace("_", " ")}</span>
                </td>
                <td className={`px-5 py-3 ${r.off ? "font-semibold text-late" : ""}`}>
                  {formatDate(r.before)}
                  {r.off && <span className="ml-2 rounded-full bg-late-soft px-2 py-0.5 text-xs">1 day early</span>}
                </td>
                <td className="px-5 py-3 font-semibold text-ready">{formatDate(due)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-ink/70">
        {broken} of {rows.length} locations showed the wrong day before the fix. Every location shows the same day now.
      </p>
    </div>
  );
}
