import { STATUSES, STATUS_LABEL, type Status } from "@/lib/types";

/** Five-segment production track. The fill colour changes once the work is done. */
export function StatusTrack({ status }: { status: Status }) {
  const i = STATUSES.indexOf(status);
  const done = status === "ready" || status === "shipped";
  return (
    <div>
      <div className="flex gap-1" aria-hidden="true">
        {STATUSES.map((s, k) => (
          <span
            key={s}
            className={`h-1.5 flex-1 rounded-full ${k <= i ? (done ? "bg-ready" : "bg-brand") : "bg-line"}`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs font-medium text-ink/75">
        <span className="sr-only">Status: </span>
        {STATUS_LABEL[status]}
      </p>
    </div>
  );
}
