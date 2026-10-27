import { notFound } from "next/navigation";
import { getCaseByToken } from "@/lib/cases";
import { dueLabel, formatDate, LAB_TZ, todayIn } from "@/lib/dates";
import { STATUS_LABEL } from "@/lib/types";
import { StatusTrack } from "@/components/StatusTrack";

export const dynamic = "force-dynamic";
export const metadata = { title: "Track your case", robots: { index: false } };

/** Clinic-facing page linked from the "ready" email. Shows no patient information. */
export default async function Track({ params: paramsPromise }: { params: Promise<{ token: string }> }) {
  const params = await paramsPromise;
  const c = await getCaseByToken(params.token);
  if (!c) notFound();
  const today = todayIn(LAB_TZ);
  const done = c.status === "ready" || c.status === "shipped";
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-7">
      <p className="text-sm text-ink/60">{c.clinic_name}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Case {c.ref}</h1>
      <p className="mt-1 text-sm">{c.type}</p>
      <div className="my-6"><StatusTrack status={c.status} /></div>
      <dl className="space-y-3 border-t border-line pt-5 text-sm">
        <div className="flex justify-between"><dt className="text-ink/60">Due date</dt><dd className="font-semibold">{formatDate(c.due_date, { year: true })}</dd></div>
        <div className="flex justify-between">
          <dt className="text-ink/60">Status</dt>
          <dd className="font-semibold">{done ? STATUS_LABEL[c.status] : dueLabel(c.due_date, today)}</dd>
        </div>
      </dl>
    </div>
  );
}
