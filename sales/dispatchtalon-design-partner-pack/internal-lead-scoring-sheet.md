# Internal Lead Scoring Sheet

**Use:** Maintain the live pipeline. Pick the 5 leads to act on this week. Demote the rest.

**Cardence:** Reviewed every Monday morning. Updated within 24 hours of every meaningful touchpoint.

**Tools:** Spreadsheet (Google Sheets, Notion DB, or Airtable). The schema below maps directly to columns. Do not use a CRM until pipeline > 20 active leads.

---

## Column schema

| Column | Type | Notes |
|--------|------|-------|
| `lead_id` | text | `DP-NNNN` — running counter, never reused |
| `company` | text | Trading name |
| `legal_entity` | text | Filled later, before agreement |
| `contact_name` | text | First + last |
| `contact_role` | text | Owner / GM / Ops manager / Dispatcher / Other |
| `worker_count` | number | If unknown, leave blank — do not guess |
| `weekly_jobs` | number | If unknown, leave blank |
| `operating_mode` | enum | labour-only / plant + labour / plant-only |
| `current_tooling` | text | What they use today (spreadsheet, OneNote, FCC, EQUIPR, paper, etc.) |
| `source` | enum | LinkedIn / referral / Formspree / event / cold email / other |
| `source_detail` | text | Who referred / which post / which event |
| `stage` | enum | new · contacted · discovery-booked · discovery-done · scoring-done · scope-sent · agreement-sent · signed · live · exited |
| `partner_type_proposed` | enum | testing / labour / founding / commercial / managed-addon / declined |
| `score_total` | number | Out of 50, from qualification scorecard |
| `score_capture_date` | date | Date the score was captured |
| `next_action` | text | One sentence — what's next, by when, owned by |
| `next_action_date` | date | When the next action is due |
| `gate_status` | enum | gate-0 / gate-1 / gate-2 / gate-3 / gate-4 — see `docs/dispatchtalon-design-partner-gate-criteria.md` |
| `risk_flags` | text | Comma-separated — `wants-payroll`, `wants-xero`, `unreachable-DM`, `expects-free-forever`, etc. |
| `notes` | text | Verbatim quotes preferred over summaries |
| `last_touch_date` | date | Updated every touchpoint |
| `last_touch_channel` | enum | email / linkedin / call / sms / in-person |
| `dormant_since` | date | Auto-fill when stage hasn't moved in 30+ days |

---

## Stage definitions

| Stage | Meaning | Exit condition |
|-------|---------|----------------|
| `new` | Captured but not contacted | First outbound sent |
| `contacted` | Outbound sent, awaiting reply | Reply received OR three nudges expired |
| `discovery-booked` | Reply received, call on calendar | Call happens |
| `discovery-done` | Call complete, not yet scored | Score captured |
| `scoring-done` | Scored against qualification scorecard | Scope or decline sent |
| `scope-sent` | Pilot scope sent | Verbal yes or no |
| `agreement-sent` | Agreement outline / final agreement sent | Signed or declined |
| `signed` | Agreement signed both sides | Kick-off happens |
| `live` | Pilot running | Exit review |
| `exited` | Pilot complete or terminated | n/a — historical record |

---

## Weekly Monday triage

1. **Open the sheet.** Filter for `next_action_date <= today`.
2. **For each row:**
   - Has the next action been done? Update.
   - Is there a new next action? Set it with a date.
   - Has the stage moved? Update.
   - Is this row dormant > 30 days with no movement? Move to re-engagement file unless it's a live pilot.
3. **Sort by `score_total` descending** for everyone in `discovery-done` or later.
4. **Pick the top 5** for active work this week.
5. **Cold outbound capacity:** 10 new `new` → `contacted` transitions per week max. Quality of outbound matters more than volume.

---

## Risk flag dictionary

Use these exact strings so filtering works:

| Flag | What it means | Default response |
|------|---------------|------------------|
| `wants-payroll` | They expect payroll automation inside the pilot | Decline that scope; consider Testing only |
| `wants-xero` | They expect direct Xero integration | Position as CSV handoff; deprecate if they insist |
| `wants-mob-app` | They expect a native mobile app today | Position PWA on roadmap; don't commit |
| `unreachable-dm` | Decision-maker is not on calls and not reachable | Park until access changes |
| `expects-free-forever` | Has explicitly said they expect free | Testing only, time-boxed |
| `procurement-led` | Procurement-driven, not operator-driven | Slow-track; not a typical design partner |
| `single-system-mandate` | They want to replace everything | Decline — out of scope |
| `legal-bound-confidentiality` | Cannot anonymise learnings | Decline or scope around it |
| `no-weekly-jobs` | Job volume too low to test workflow | Park |
| `wrong-size-too-small` | < 10 workers, < 3 jobs/week | Park |
| `wrong-size-too-large` | > 250 workers | Refer to Commercial Pilot only |
| `competitor-overlap` | Already on FCC or EQUIPR and content | Park six months |
| `champion-only` | One enthusiastic contact, no internal traction | Build the second contact before progressing |

---

## Stage transition rules — do not skip

### `new` → `contacted`
- Must use a template from `design-partner-outreach-messages.md`. No off-cuff cold messages.

### `contacted` → `discovery-booked`
- The reply must indicate they understand DispatchTalon is decision-support, not payroll / Xero / compliance. If they're replying based on a misread, correct it in the booking exchange.

### `discovery-booked` → `discovery-done`
- The 30-minute call must follow `design-partner-discovery-call-script.md`. All twelve sections covered or score zero on missing ones.

### `discovery-done` → `scoring-done`
- Scored against `design-partner-qualification-scorecard.md`. Score captured in the sheet within 30 minutes of the call ending.

### `scoring-done` → `scope-sent` OR decline
- Decline must use B4 from `design-partner-follow-up-templates.md`. No silent ghosts.
- Scope must match the partner type from the scorecard banding, not what the partner wants.

### `scope-sent` → `agreement-sent`
- Only after verbal yes on scope and pricing. Do not send an agreement to "see if they bite."

### `agreement-sent` → `signed`
- Both parties' lawyers have reviewed. Signed agreement on file in {{secure_drive}}.

### `signed` → `live`
- Tenant provisioned. Worker list imported. Kick-off held. Day 1 metrics baselined.

### `live` → `exited`
- Exit review held. Outcome record completed. Data export issued. Continuation decision recorded.

---

## What the sheet is for, and what it isn't

It is:

- The single source of truth for who's where in the pipeline
- The input to Monday's planning
- The audit trail for what Cody promised, when, to whom

It isn't:

- A CRM substitute long-term — once pipeline > 20 active leads, move to a proper tool
- A marketing list — outbound is opt-in by sector context, not a blast
- A place to store legal documents — those live in the secure drive, this sheet links to them
- A satisfaction tracker — the success-metrics record is the right place for outcomes

---

## Privacy hygiene

- No login passwords in the sheet. Ever. Even for testing.
- Worker names from partner data stay in the DispatchTalon tenant, not the lead sheet.
- Email addresses are the only personal data here, and only of the contact, not of their workers.
- Sheet is access-controlled to Cody and an explicit named list. No "anyone with the link" sharing.

---

## Migration trigger

When any of these are true, migrate from spreadsheet to a CRM (HubSpot, Pipedrive, or Attio):

- Active leads > 20
- More than one person editing the sheet
- Need for inbound form-to-row automation
- Need for email tracking or sequence sending

Until then, the sheet is enough. Premature CRM adoption is a bigger drag than the sheet.

---

*This sheet is an internal operating tool. Anonymised aggregates of pipeline health may be referenced in strategy reviews; partner-identifying detail does not leave the sheet without explicit consent.*
