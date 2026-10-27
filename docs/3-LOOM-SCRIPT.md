# Loom script (target 2:45, hard limit 3:00)

Timing is tight with the extras. If you run over, cut the filter/search click and the reset line first.

Record at a normal pace. Open three tabs first: live app, `lib/dates.ts`, `lib/notify.ts`. Set your laptop (or browser devtools) to a US timezone if you want to show the bug live.

**0:00 – 0:15 Context**
"I'm [name]. This is LabTrack, my take on the take-home. Maria asked for three things before a Friday demo: fix wrong due dates, email clinics when a case is ready, and tidy the dashboard. I'll show what I built and one thing I'd change."

**0:15 – 0:50 The dashboard**
- Show the Cases page. "Overdue work is at the top, the strip shows how much falls due each day, and every case has one obvious next step."
- Point at the ready case that is past due: "A case that's finished but still sitting in the lab past its due date counts as late. That's the one the lab has to ship today."
- Click one filter chip and search once. Say: "I stopped here on the redesign on purpose. 'Cluttered' needs a conversation with Maria, so I shipped safe wins and asked her what her team looks at first."

**0:50 – 1:35 The due-date fix**
- Open the "Due-date check" page. "Before, the due date was a timestamp. A clinic in New York or LA saw the 13th instead of the 14th. Red rows are the old behaviour, green is now."
- Switch to `lib/dates.ts`. "A due date is a calendar date, stored as text. All the maths is on year, month and day. Only 'what is today' uses a timezone, and that is always the lab's."
- Mention the tests: "31 tests, including one that runs the same date through twelve timezones, and one that simulates a double-click under slow-database conditions. That one caught a real bug that could send a clinic two emails; I fixed it with a one-line atomic update."

**1:35 – 2:15 Notify when ready**
- On Cases, click "Mark ready" on a QC case. Banner appears. Open the Outbox, expand the email.
- "No patient details in the email, because it's health data. Test mode saves emails here instead of sending, so the demo can't email a real clinic."
- Show the unique index in `lib/db.ts`. "One email per case per ready moment, enforced by the database, so double-clicks and retries can't double-send."
- Optional, 10 seconds: scroll to "Reset demo data". "One click puts the demo back to the start, so I can rerun it for the clinic group."

**2:15 – 2:50 One decision I'd make differently**
"Right now the email is sent inside the request when you click 'Mark ready'. It's fine for a demo and failures are caught and retryable. But at real volume I'd make it a queued job with automatic retries, so a slow email provider never slows the lab's screen. I kept it inline because the take-home asked for three to four hours, but that's the first thing I'd change."

**2:50 – 3:00 Close**
"Questions for Maria, a client email and the tickets are in the repo. Thanks for watching."

> Tip: do one practice run. Don't read this; say it in your own words. Make sure you can answer "why a text column instead of a date column?" (SQLite has no date type, and more importantly a calendar date has no timezone to get wrong).
