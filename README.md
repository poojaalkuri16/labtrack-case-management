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

### Request and data flow

1. A staff member uses the Cases dashboard to create a case or advance its status.
2. Next.js routes validate and process the action through the application workflow.
3. `lib/workflow.ts` handles status transitions and records when a case becomes ready.
4. `lib/db.ts` reads and writes case, clinic, and notification records in libSQL/SQLite.
5. When a case becomes ready, `lib/notify.ts` builds the email and claims a notification slot before delivery.
6. In test mode, the email is recorded in the Outbox. With Resend configured, the notification can be delivered through the provider.
7. The email includes a tracking URL. The public tracking page uses an unguessable token and does not expose patient details.
8. Vitest tests exercise date handling, notification idempotency, concurrency, delivery failures, late-case rules, and demo reset behavior.

### Key design decisions

#### 1. A due date is a calendar date, not a timestamp

A value such as `2026-11-14` represents the same calendar day for every clinic. Converting it to a UTC timestamp and then rendering it in a visitor's timezone can shift the displayed date by one day.

LabTrack keeps due dates as `YYYY-MM-DD` strings from storage through display. `lib/dates.ts` contains the date handling, and the database validates the date shape with a `CHECK` constraint. "Today" and "overdue" are calculated using the lab's configured timezone (`LAB_TIMEZONE`, default `Europe/Berlin`).

#### 2. The database prevents duplicate notifications

The `notifications` table has a unique index on `(case_id, kind, cycle)`. The workflow claims the notification slot with `INSERT OR IGNORE` before sending. This protects against double-clicks and concurrent requests creating duplicate notifications for the same ready cycle.

If a case is reopened and later marked ready again, it starts a new cycle and may generate a new notification. The provider request also uses an `Idempotency-Key`.

#### 3. Email delivery is failure-tolerant

Test mode stores generated messages in the Outbox and sends nothing externally. With Resend configured, the same notification workflow can deliver email. Delivery failures and retries are handled in `lib/notify.ts`. For a high-volume production system, this synchronous request flow should be moved to a background queue.

## Technology stack

| Area | Technology |
| --- | --- |
| Application | Next.js App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Data layer | libSQL client; SQLite locally, Turso optionally |
| Notifications | Outbox in test mode; Resend for live email |
| Testing | Vitest |
| Deployment | Vercel |

## Project structure

```text
app/
  page.tsx                 # Cases dashboard
  timezone/page.tsx        # Due-date timezone demonstration
  outbox/page.tsx          # Generated email log and retry UI
  ...                      # New-case, tracking, and workflow routes
lib/
  db.ts                    # Schema, constraints, and seed data
  dates.ts                 # Calendar-date handling
  workflow.ts              # Case status transitions
  notify.ts                # Email composition, claiming, and delivery
tests/
  dates                   # Date and timezone behavior
  notify                  # Notification workflow
  concurrency             # Duplicate prevention under concurrency
  delivery                # Delivery failures and retries
docs/
  homepage.png
  architecture.png
  new-case.png
  mark-ready.png
  outbox.png
  tracking-page.png
  due-date-check.png
```

## Getting started

### Requirements

- Node.js and npm
- A terminal in the project directory

### Install and run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The local database is created and seeded for the demo.

### Run tests and build

```bash
npm test
npm run typecheck
npm run build
```

The test suite covers timezone/date invariance, calendar calculations, notification idempotency, concurrency, delivery failures, late-case rules, and demo reset behavior.

## Configuration

The demo works without external service credentials. Optional environment variables enable persistent database hosting and live email.

| Variable | Purpose |
| --- | --- |
| `LAB_TIMEZONE` | Lab timezone used to determine "today" and overdue cases. Defaults to `Europe/Berlin`. |
| `TURSO_DATABASE_URL` | Turso/libSQL database URL for persistent hosted data. |
| `TURSO_AUTH_TOKEN` | Authentication token for the Turso database. |
| `RESEND_API_KEY` | Enables live email delivery through Resend. |
| `NOTIFY_FROM` | Verified sender address used by Resend. |

See `.env.example` for the environment variable names and expected format. Keep secrets out of source control.

## Deployment

A demo deployment can run on Vercel without external credentials. In that configuration, the database uses a temporary local fallback and may be reseeded after a cold start; it is intended for demonstration rather than persistent production data.

For a more persistent deployment:

1. Push the project to a Git repository.
2. Import the repository into Vercel and deploy.
3. Create a Turso database and configure `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in the Vercel project settings.
4. For live email, configure `RESEND_API_KEY` and `NOTIFY_FROM` with a verified sender.
5. Set `LAB_TIMEZONE` to the lab's confirmed timezone.
6. Add the deployed URL to the live-demo link at the top of this README.

## Security and privacy notes

- Clinic email content avoids patient names and patient-specific details.
- Public tracking links use unguessable tokens; they should be treated as bearer links.
- The current demo has no staff login. A production deployment should add authentication and authorization for staff-facing pages and actions.
- Keep database credentials and email-provider keys in environment variables, never in source control.

## Known limitations and next steps

- Email delivery currently occurs in the request flow. At higher volume, move delivery to a queue with controlled retries and monitoring.
- `LAB_TIMEZONE` is a single lab-wide setting and should be confirmed with the lab.
- Staff authentication and role-based access are not implemented.
- WhatsApp notifications are not implemented; they require a verified WhatsApp Business account and approved templates.
- Existing production records should be audited and corrected with a one-off migration if historical dates were already shifted.

## AI tool usage

Document AI tools used during development accurately and specifically. Do not claim that a tool was used unless it was part of the actual workflow.
