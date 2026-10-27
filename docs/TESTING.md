# Testing strategy

The risk in this app is not the UI, it is two promises: **a due date never changes with the viewer's timezone** and **a clinic is emailed exactly once per "ready" moment**. 31 tests in total. The tests are weighted to those two promises.

## Layers

| Layer | What it proves | Where |
| --- | --- | --- |
| Unit (pure) | Calendar maths, formatting, and "today" are correct in 12 timezones; every day of 2026-2028 round-trips; lab-midnight and DST edges | `tests/dates.test.ts` |
| Integration (real SQLite file) | Status changes, one email per ready moment, reopen and re-ready, no patient data in the email, bad input rejected | `tests/notify.test.ts` |
| Concurrency | A double-click that overlaps under database latency still sends one email | `tests/concurrency.test.ts` |
| Failure paths (fake email provider) | Provider error keeps the case Ready, shows Failed, Retry reuses the same idempotency key; network error does not throw; clinic without an email is flagged; a failed database start-up is not cached | `tests/delivery.test.ts` |
| End to end (manual, below) | The real pages in a real browser, in other timezones | checklist |

`npm test` runs everything in about 20 seconds. No network or API key is needed.

## Why the concurrency test injects latency

A local SQLite file answers in microseconds, so two simultaneous requests never truly overlap and the bug cannot appear. Hosted databases answer in tens of milliseconds. The test wraps the database client with a random 0-15 ms delay so the overlap happens. Against the earlier code (which let a losing request overwrite `ready_at`), roughly 1 in 10 to 1 in 5 trials sent two emails. The fix is one line: `UPDATE ... WHERE id = ? AND status != ?`.

## Manual end-to-end checklist (run on the deployed URL before Friday)

1. Open the app with the browser set to **America/Los_Angeles** (DevTools, Sensors, Location, or the OS clock). Case list, tracking page and Outbox email all show the same due date as in Berlin.
2. Repeat with **Pacific/Auckland** and **Pacific/Honolulu**.
3. Click **Mark ready** on a Quality check case. One banner, one Outbox entry. Press back and click again: still one entry.
4. Double-click **Mark ready** quickly. Still one entry.
5. Open the tracking link from the Outbox email in a private window. It shows the case, the due date, and no patient reference.
6. Create a case with due date 30 Feb by editing the form value. It is rejected with a clear message.
7. Reload the Outbox a few times in a row (Vercel can serve different instances). The entry from step 3 must always be there. If it sometimes disappears, the database is not persistent: set the Turso variables.
8. `/timezone` shows 4 of 9 locations wrong "before" and all correct "now".

## Optional: browser tests with Playwright

Not included, to keep the repo small. If you add them, keep them out of `npm test` (Vitest would pick up `*.spec.ts`) by putting them in `e2e/` and excluding that folder in a `vitest.config.ts`. Useful cases: the same due date under `timezoneId: "America/Los_Angeles"` and `"Pacific/Auckland"`, and "mark ready twice sends one email".

## Known gaps

- Dashboard filters live inside the page component, so they are only covered by the manual checklist. Moving them to `lib/` would make them unit-testable.
- A notification left in "Sending" (the server stopped between claiming and sending) has no retry button. At real volume this belongs in a queued job.

## Added later
- `tests/dashboard.test.ts`: a ready case past its due date counts as late; shipped never does.
- `tests/reset.test.ts`: the demo reset clears cases and emails, restores 13 sample cases, and can be repeated.
- Manual: on the Cases page, "Reset demo data" (below the list) returns to the starting state. Set `DEMO_RESET=off` for anything real.

## Next.js version note
This code targets Next.js 15 or newer, where `searchParams` and `params` are Promises (the pages `await` them). If `npm run typecheck` reports "missing ... then, catch, finally", delete the `.next` folder and run it again; stale generated types cause the same message.
