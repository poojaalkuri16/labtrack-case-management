# Tickets for Maria's email

Maria's email holds three requests, but only one is clearly a bug. The other two are vague enough that building them blind would waste the days before Friday's demo. So each ticket below has acceptance criteria, and the questions at the end are what I would ask her before touching code.

Priority is set by the Friday demo with the big clinic group: anything a clinic will see on screen comes first.

---

## LT-1 Due date shows one day early for clinics abroad (bug, P0)

**Why it matters:** wrong dates in front of a big clinic group is the fastest way to lose trust.

**Likely cause:** the due date is stored or parsed as a timestamp (midnight UTC, or midnight in the lab's timezone), then shown in each viewer's local timezone. Clinics west of the lab see the previous day. To confirm, I need one real example from Maria (see questions).

**Acceptance criteria**
- A due date is stored as a calendar date (`YYYY-MM-DD`), not a timestamp.
- The same case shows the same due date for a viewer in any timezone (tested for at least 12 zones, including UTC-10 and UTC+14).
- "Today", "due today" and "overdue" are calculated in the lab's timezone only.
- Existing cases are checked and, where the stored value was shifted, corrected. Maria confirms a sample of 5 before we run it on all.
- Impossible dates (30 Feb) are rejected on create and edit.
- Emails and any clinic-facing page show the same date as the dashboard.

**Out of scope:** per-clinic delivery cut-off times ("by 5pm their time").

---

## LT-2 Email clinics when their case is ready (P0)

**Acceptance criteria**
- When a case changes to "Ready", the clinic's email address receives one message with the case reference, work type, due date and a tracking link.
- The message contains no patient name or patient reference (health data).
- Changing the status to "Ready" twice, double-clicking, or retrying never sends a second email for the same ready moment.
- If a case is reopened and becomes ready again, the clinic is told again.
- If sending fails, the status change still succeeds, the failure is visible to staff, and it can be retried with one click.
- A clinic with no email address is flagged, not silently skipped.
- Test mode saves the exact email to an Outbox without sending, so we can demo safely.
- Sent from an address on the lab's own domain (needs Maria: see questions).

**Out of scope for this ticket:** WhatsApp (LT-3), clinics choosing their own preferences, SMS.

---

## LT-3 WhatsApp notifications (P2, not started)

**Why separate:** WhatsApp is not "email with a different icon". Messages sent to clinics first are only allowed through pre-approved templates on the WhatsApp Business API, which needs a verified business account and takes days to weeks.

**Acceptance criteria**
- Each clinic can be set to email, WhatsApp, or both.
- A WhatsApp template for "case ready" is approved by Meta.
- If WhatsApp delivery fails, the system falls back to email.
- Clinics can opt out.

**Blocked by:** Maria's decision to proceed, a business phone number, and clinic phone numbers.

---

## LT-4 Dashboard feels cluttered (P1: discovery first)

"Cluttered" is a symptom, not a requirement. A redesign without knowing what Maria's team does all day would be guesswork.

**Quick wins (safe to ship before Friday)**
- One list, sorted by due date, with overdue work at the top.
- A strip showing how many cases fall due on each of the next days.
- Four filters (Active, Overdue, Ready to dispatch, Shipped) and one search box.
- One obvious next action per case ("Send to QC", "Mark ready"), other actions tucked away.
- Progress shown as a single bar, not several badges.

**Acceptance criteria for the quick wins**
- A lab user can find every overdue case in one click.
- A case can be advanced to its next stage in one click.
- No more than six columns are visible at desktop width.

**Real redesign:** scheduled after a 20-minute call where Maria shows me her screen and tells me which three things her team looks at first.

---

## LT-5 Friday demo readiness (P0)

**Acceptance criteria**
- Demo data covers clinics in at least four countries and every case status.
- The Friday walkthrough (mark a case ready, show the email, show the due date from a US clinic) works end to end on the live URL.
- Nothing can email a real clinic during the demo unless we deliberately switch that on.

---

## Questions for Maria, in the order I would ask

**Blocking (answer before I build)**
1. Which timezone is the lab in, and what does "due on the 14th" mean to you: by the start of the day, by end of day, or when the parcel arrives at the clinic?
2. Can you send me one case where a clinic saw the wrong date, with the clinic's country and what they saw? That tells me if it is a display bug or bad stored data.
3. Which email address should clinics receive these from, and do you control that domain? (Needed so messages don't land in spam.)
4. Where do clinic email addresses live today, and are they accurate? Who at the clinic should get the message?

**Important (answer this week)**
5. WhatsApp: do you already have a WhatsApp Business account? Are clinics expecting messages there, and do you have their consent?
6. "Ready" means finished in the lab. Do clinics also want to know when it ships or is delayed?
7. Dashboard: which three things does your team look at first each morning, and what do you never use?
8. Who will use the demo on Friday, and what do you most want the clinic group to see?

**Good to know**
9. How many cases a day, and how many clinics? (Sizing, and decides when we need a proper job queue.)
10. Do patient details ever need to appear in clinic emails? My default is no, because it is health data.
