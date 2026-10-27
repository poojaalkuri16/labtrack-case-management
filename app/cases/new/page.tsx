import Link from "next/link";
import { listClinics } from "@/lib/cases";
import { addDays, LAB_TZ, todayIn } from "@/lib/dates";
import { Flash } from "@/components/Flash";
import { addCase } from "@/app/actions";

export const dynamic = "force-dynamic";

const field = "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm";

export default async function NewCase({ searchParams: searchParamsPromise }: { searchParams: Promise<{ err?: string }> }) {
  const searchParams = await searchParamsPromise;
  const clinics = await listClinics();
  const today = todayIn(LAB_TZ);
  return (
    <div className="max-w-xl">
      <Link href="/" className="text-sm text-ink/70 hover:underline">← Back to cases</Link>
      <h1 className="mb-6 mt-3 font-display text-3xl font-semibold tracking-tight">New case</h1>
      <Flash err={searchParams.err} />
      <form action={addCase} className="space-y-5 rounded-xl border border-line bg-white p-6">
        <label className="block text-sm font-medium">
          Clinic
          <select name="clinic" required className={field}>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.country})</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Work
          <input name="type" required placeholder="Zirconia crown" className={field} />
        </label>
        <label className="block text-sm font-medium">
          Patient reference
          <input name="patient" required placeholder="P-1234" className={field} />
          <span className="mt-1 block text-xs font-normal text-ink/60">Use the clinic’s reference, not the patient’s name.</span>
        </label>
        <label className="block text-sm font-medium">
          Due date
          <input type="date" name="due_date" required min={today} defaultValue={addDays(today, 7)} className={field} />
          <span className="mt-1 block text-xs font-normal text-ink/60">
            A calendar date in lab time. Every clinic sees this same date.
          </span>
        </label>
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90">Create case</button>
      </form>
    </div>
  );
}
