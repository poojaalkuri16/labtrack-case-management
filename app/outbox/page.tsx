import { listNotifications } from "@/lib/cases";
import { retryEmail } from "@/app/actions";

export const dynamic = "force-dynamic";

const BADGE: Record<string, { label: string; cls: string }> = {
  sent: { label: "Sent", cls: "bg-ready-soft text-ready" },
  test: { label: "Test mode, not sent", cls: "bg-brand-soft text-brand" },
  failed: { label: "Failed", cls: "bg-late-soft text-late" },
  pending: { label: "Sending", cls: "bg-warn-soft text-warn" },
};

export default async function Outbox({ searchParams: searchParamsPromise }: { searchParams: Promise<{ n?: string }> }) {
  const searchParams = await searchParamsPromise;
  const items = await listNotifications();
  const live = Boolean(process.env.RESEND_API_KEY) && process.env.NOTIFY_MODE !== "test";
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Outbox</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink/70">
        Every “your case is ready” email, exactly as the clinic receives it.{" "}
        {live ? "Live mode: emails are sent through Resend." : "Test mode: emails are saved here and nothing leaves the app. Add a Resend key to go live."}
      </p>
      {searchParams.n === "sent" || searchParams.n === "test" ? (
        <p role="status" className="mt-4 rounded-lg bg-ready-soft px-4 py-3 text-sm font-medium text-ready">Retry worked.</p>
      ) : searchParams.n === "failed" ? (
        <p role="status" className="mt-4 rounded-lg bg-late-soft px-4 py-3 text-sm font-medium text-late">Retry failed. Check the error below.</p>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-line bg-white px-6 py-14 text-center text-sm text-ink/70">
          Nothing here yet. Mark a case as “Ready” on the Cases page and the clinic’s email will appear here.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((n) => {
            const b = BADGE[n.status] ?? BADGE.pending;
            return (
              <li key={n.id} className="rounded-xl border border-line bg-white">
                <details>
                  <summary className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <span>
                      <span className="block text-sm font-semibold">{n.subject}</span>
                      <span className="block text-xs text-ink/60">
                        To {n.to_email ?? "no address"} · {new Date(n.created_at).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
                      </span>
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${b.cls}`}>{b.label}</span>
                  </summary>
                  <div className="border-t border-line px-5 py-4">
                    {n.error && <p className="mb-3 text-sm font-medium text-late">Error: {n.error}</p>}
                    <pre className="whitespace-pre-wrap rounded-lg bg-porcelain p-4 font-sans text-sm leading-relaxed">{n.body_text}</pre>
                    {n.status === "failed" && (
                      <form action={retryEmail} className="mt-3">
                        <input type="hidden" name="id" value={n.id} />
                        <button className="rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-white">Retry sending</button>
                      </form>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
