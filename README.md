# LabTrack

**Case tracking for dental laboratories.** LabTrack helps a dental lab manage case progress, keep due dates consistent across time zones, and notify clinics when work is ready.

> **Live demo:** [Add your Vercel URL](#deployment)  
> **Stack:** Next.js App Router, TypeScript, Tailwind CSS, libSQL (SQLite/Turso), Vitest

## Overview

LabTrack was built as a Chiron Labs FDE take-home project around three practical needs:

- **Reliable due dates:** a due date is stored and displayed as a calendar date (`YYYY-MM-DD`), not converted through a browser-local timestamp.
- **Dependable ready notifications:** marking a case as ready creates one clinic email. In test mode, the message is saved to the Outbox rather than sent.
- **A calmer workflow:** one sorted case list, a six-day due-date strip, status filters, search, and a clear next action for each case.

The app also provides a public tracking page for each case and a Due-date check page that demonstrates the original timezone bug alongside the fix.

## Screenshots

### Cases dashboard

The dashboard surfaces overdue work, upcoming due dates, progress, filters, search, and the next action for each case.

![LabTrack cases dashboard](docs/homepage.png)

### Create a case

Create a case by selecting a clinic, entering the work type and clinic-specific patient reference, and choosing a due date.

![New case form](docs/new-case.png)

### Mark a case ready

When a case reaches **Ready**, LabTrack triggers the notification workflow. In test mode, the interface confirms that the email was saved to the Outbox and not sent.

![Case marked ready](docs/mark-ready.png)

### Outbox

The Outbox shows the generated clinic email, recipient, timestamp, and test-mode status. This makes the message reviewable without sending email during a demo.

![Notification in Outbox](docs/outbox.png)

### Public tracking page

The tracking link from the email opens a public case status page. It displays the case work, status, and due date without exposing patient details.

![Public case tracking page](docs/tracking-page.png)

### Due-date check

The Due-date check page compares the old timezone-sensitive display with the corrected calendar-date behavior across multiple clinic locations.

![Due-date check page](docs/due-date-check.png)

## Architecture

![LabTrack application architecture](docs/architecture.png)

What happens when a case is marked ready
Staff click Mark ready on the Cases page.
The changeStatus server action runs on the server.
lib/workflow.ts changes the status with a single atomic update (UPDATE … WHERE status != new) and records when the case became ready. If two requests arrive together, only the first changes anything.
lib/notify.ts builds the email and claims a notification slot in the database before sending.
In test mode the email is saved to the Outbox. With Resend configured, it is sent through Resend.
The email contains a tracking link. The public tracking page uses an unguessable token and shows no patient details.
Key design decisions
1. A due date is a calendar date, not a timestamp

2026-11-14 means the same day for every clinic. Turning it into a UTC timestamp and displaying it in the visitor's timezone can shift it to the 13th for clinics west of Greenwich, which was the original bug.

LabTrack keeps the due date as a YYYY-MM-DD string from the database to the screen. lib/dates.ts does all date maths on the year, month and day, and a database CHECK constraint rejects anything that isn't shaped like a date. Only "what is today?" needs a timezone, and that is always the lab's (LAB_TIMEZONE, default Europe/Berlin), never the viewer's.

2. The database prevents duplicate emails

The notifications table has a unique index on (case_id, kind, cycle), where cycle is the moment the case became ready. The code claims the slot with INSERT OR IGNORE before sending, so a double-click or a retry cannot produce a second email for the same ready moment. The status change itself is atomic, so two overlapping requests cannot start two cycles, and the email provider call carries an Idempotency-Key.

If a case is reopened and marked ready again, that starts a new cycle and the clinic is told again, which is intended.

3. A failed email never blocks the lab

If sending fails, the case still becomes Ready, the failure appears in the Outbox, and staff can retry with one click. A clinic with no email address is flagged as a failure rather than skipped silently.

Technology
Area	Technology
Application	Next.js 15 (App Router), React 18
Language	TypeScript
Styling	Tailwind CSS
Data	libSQL client: SQLite file locally, Turso when deployed
Email	Outbox in test mode, Resend for live email
Testing	Vitest
Hosting	Vercel
Project structure
text
app/
  page.tsx                 Cases dashboard
  actions.ts               Server actions: change status, add case, retry email, demo reset
  cases/new/page.tsx       New case form
  outbox/page.tsx          Email log and retry
  timezone/page.tsx        Due-date check (old bug vs. fix)
  track/[token]/page.tsx   Public tracking page
components/                Nav, status progress bar, banners
lib/
  dates.ts                 Calendar-date maths and the lab's "today"
  workflow.ts              Status changes (atomic) and ready timestamp
  notify.ts                Email building, claim-then-send, delivery, retry
  dashboard.ts             What counts as late and what is due on a day
  cases.ts                 Queries
  db.ts                    Schema, constraints, seed data, demo reset
  types.ts                 Shared types
tests/
  dates.test.ts            Dates identical across 12 timezones, DST and leap years
  notify.test.ts           One email per ready moment, no patient data
  concurrency.test.ts      Double-click under slow-database conditions
  delivery.test.ts         Provider errors, retry, clinic without an email
  dashboard.test.ts        Late-case rules
  reset.test.ts            Demo reset
docs/
  1-TICKETS.md             Tickets, acceptance criteria and questions for the client
  2-CLIENT-UPDATE-EMAIL.md Plain-English update to the client
  TESTING.md               Test strategy and manual checklist
  *.png                    Screenshots and architecture diagram
Getting started
Requirements
Node.js 20 or newer, and npm
Run locally
bash
npm install
npm run dev

Open http://localhost:3000. No configuration is needed: a local database is created and filled with sample data on first start.

Test and build
bash
npm test             # 31 tests
npm run typecheck
npm run build

The tests cover dates in twelve timezones, one email per ready moment, double-clicks under a slow database, email failures and retries, late-case rules and the demo reset. See docs/TESTING.md for the strategy and a manual checklist.

Configuration

Everything is optional. Without any variables the app runs locally in test mode.

Variable	Purpose
LAB_TIMEZONE	The lab's IANA timezone, used for "today" and "overdue". Default Europe/Berlin.
TURSO_DATABASE_URL	Turso database URL for persistent hosted data.
TURSO_AUTH_TOKEN	Token for the Turso database.
RESEND_API_KEY	Turns on live email through Resend. Leave unset to stay in test mode.
NOTIFY_FROM	Verified sender address for Resend.
NOTIFY_MODE	Set to test to force test mode even when a Resend key is present.
NEXT_PUBLIC_APP_URL	Public site URL used for tracking links in emails.
DEMO_RESET	Set to off to hide the Reset demo data control.

See .env.example for the format. Never commit real keys.

Deployment
Push the project to a GitHub repository and import it into Vercel.
Create a free Turso database and set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the Vercel project settings. Without them each serverless instance keeps its own temporary database, so data can seem to disappear between requests.
Optional: set RESEND_API_KEY and NOTIFY_FROM (a verified sender) for live email.
Optional: set LAB_TIMEZONE to the lab's confirmed timezone.
For anything other than a demo, set DEMO_RESET=off.
Security and privacy
Emails contain the case reference and work type only, never a patient name or patient reference.
Tracking links use unguessable tokens. Treat them as private links: anyone who has one can open that case's status page.
There is no staff login in this version. A real deployment needs authentication for staff pages and actions.
Keep database credentials and email keys in environment variables, never in source control.
Known limitations and next steps
Emails are sent during the request. At higher volume this should be a background queue with automatic retries.
A notification left in "Sending" because the server stopped mid-request has no retry button yet.
There is no screen for editing a due date on an existing case.
LAB_TIMEZONE is a single lab-wide setting that the lab still needs to confirm.
WhatsApp is not built. It needs a verified WhatsApp Business account and pre-approved message templates.
If historical due dates were already shifted, existing records need a one-off audit and correction.
How I used AI

I used AI tools throughout this project and checked what they produced.

Claude (Anthropic): drafted the initial project structure, date library, tests and written documents. In a later review it found and helped me fix a rare duplicate-email bug under overlapping requests and a database start-up failure that was cached. It also helped add the past-due flag, the demo reset, extra tests and the architecture diagram.
Cursor: used to run the app, fix errors and apply changes.
What I did myself: ran the tests, type check and production build on my machine, tested the pages in the browser under different timezones, resolved the dependency versions, deployed the app, took the screenshots, and wrote the client email and the walkthrough video.elopment accurately and specifically. Do not claim that a tool was used unless it was part of the actual workflow.
