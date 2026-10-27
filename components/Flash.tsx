import Link from "next/link";

type P = { n?: string; caseRef?: string; s?: string; err?: string };

export function Flash({ n, caseRef, s, err }: P) {
  if (err) return <Banner tone="late">{err}</Banner>;
  if (!n) return null;
  const msg: Record<string, { tone: "ready" | "brand" | "warn" | "late"; text: React.ReactNode }> = {
    sent: { tone: "ready", text: <>Case {caseRef} is ready and the clinic has been emailed.</> },
    test: {
      tone: "brand",
      text: <>Case {caseRef} is ready. Test mode is on, so the email was saved to the <Link className="underline" href="/outbox">Outbox</Link> and not sent.</>,
    },
    skipped: { tone: "warn", text: <>Case {caseRef} is ready. The clinic was already told, so no second email was sent.</> },
    failed: {
      tone: "late",
      text: <>Case {caseRef} is ready, but the email failed. Retry it from the <Link className="underline" href="/outbox">Outbox</Link>.</>,
    },
    moved: { tone: "brand", text: <>Case {caseRef} moved to “{s}”.</> },
    due: { tone: "brand", text: <>Due date updated for case {caseRef}.</> },
    reset: { tone: "ready", text: <>Demo data reset. Fresh cases are loaded and the Outbox is empty.</> },
    created: { tone: "ready", text: <>Case {caseRef} created.</> },
  };
  const m = msg[n];
  return m ? <Banner tone={m.tone}>{m.text}</Banner> : null;
}

function Banner({ tone, children }: { tone: "ready" | "brand" | "warn" | "late"; children: React.ReactNode }) {
  const t = {
    ready: "bg-ready-soft text-ready", brand: "bg-brand-soft text-brand",
    warn: "bg-warn-soft text-warn", late: "bg-late-soft text-late",
  }[tone];
  return (
    <div role="status" className={`mb-5 rounded-lg px-4 py-3 text-sm font-medium ${t}`}>
      {children}
    </div>
  );
}
