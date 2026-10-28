**Subject:** LabTrack update: due dates fixed, "ready" emails working, what I need before Friday

Hi Maria,

Here is where things stand ahead of Friday's demo. You can try everything yourself at **[LIVE URL]**. The cases and clinics in it are sample data.

**What I shipped**

1. **Due dates now match everywhere.** Clinics saw a date one day early because the app was treating the due date as a moment in time, so each clinic's computer shifted it into its own timezone. It is now stored as a plain calendar date, so a case due on the 14th shows the 14th in London, Los Angeles and Sydney. There is a page called "Due-date check" that shows the old and new behaviour side by side.
2. **Clinics get an email when their case is ready.** The moment you mark a case "Ready", the clinic gets one short email with the case number, the work type, the due date and a link to track it. It never sends twice for the same case, and it leaves out the patient's details on purpose. If an email fails, you will see it and can retry with one click.
3. **A calmer case list.** One list sorted by due date with overdue work at the top, a strip showing what is due over the next few days, and one clear next step on each case. A case that is finished but still waiting to be shipped after its due date is flagged too, so it does not get forgotten.
4. **A reset button for the demo.** One click returns the sample data to the starting point, so we can run Friday's walkthrough more than once.

**What I did not ship, and why**

- **WhatsApp.** WhatsApp only lets businesses message customers through pre-approved templates, and approval takes days to weeks. I would rather give you reliable email on Friday than a WhatsApp feature that might not work in front of the clinic group. If you want it, I can start the approval now.
- **A bigger dashboard redesign.** The list is tidier, but I do not want to guess what "cluttered" means to your team. Fifteen minutes with you will tell me more than another day of design.
- **Fixing old cases.** New cases are right. I have not yet changed dates on existing cases because I want you to confirm a few first (see below).
- **Editing a due date on an existing case.** Not built yet. It is a small addition once you tell me who is allowed to change dates.
- **Real emails to real clinics.** The app is in test mode: the emails are saved in an "Outbox" page so you can see exactly what clinics will receive, but nothing is sent yet. This is deliberate, so nothing goes out by accident before the demo.

**What I need from you**

1. **A sending address** on your own domain (for example cases@yourlab.com), and access to its DNS settings so emails do not land in spam. This is the only thing blocking real emails.
2. **Which timezone your lab is in**, and whether "due on the 14th" means start of day, end of day, or arrival at the clinic.
3. **One example** of a case where a clinic saw the wrong date, so I can check it against the old data.
4. **Clinic email addresses** and who at each clinic should receive the message.
5. **A 15-minute call** so you can show me which parts of the dashboard your team uses and which get in the way.
6. **Whether you want WhatsApp.** If yes, I need a business phone number and your clinics' agreement to receive messages.

If you can send items 1 and 2 by Wednesday, I can switch on real emails and test with one friendly clinic before Friday.

Best,
Pooja A
