# DispatchTalon Design Partner Gate Criteria

**Status:** Internal operating gate document | May 2026
**Owner:** Cody / Pressure Systems
**Companion to:** `sales/dispatchtalon-design-partner-pack/`

This document defines the gates a design-partner lead must pass through to move from "cold name on a list" to "live, paying, measurable pilot." It exists so Cody can be honest with himself about which leads are real and which are stalled, and so the team has a shared definition of "qualified."

If a lead has not cleared a gate, do not start the work the next gate requires.

---

## The five gates

| Gate | Name | Outcome of passing |
|------|------|--------------------|
| Gate 0 | Sourcing | A named contact with sector fit is in the lead sheet |
| Gate 1 | First contact | They've replied to an inbound or outbound message |
| Gate 2 | Discovery | A discovery call has happened and they've been scored |
| Gate 3 | Scope agreement | They've said yes to scope and pricing in writing |
| Gate 4 | Pilot live | Agreement signed, tenant provisioned, kick-off held |

A pilot that has cleared all five gates and reached week 12 is then evaluated against the success-metrics exit criteria, not these gates.

---

## Gate 0 — Sourcing

**A lead can enter the sheet when ALL of:**

- A specific contact name and either a phone number or email exists
- The company can be identified in the crane / rigging / labour-hire / plant allocation sector (or adjacent — confirm with Cody if uncertain)
- Worker count is in the 5–250 band (best fit: 15–40)
- They are not currently on FCC at scale with a recent signed renewal — if they are, mark `competitor-overlap` and decline by default

**Block exits if ANY of:**

- Contact is a generic info@ inbox with no named person
- Industry fit is uncertain — they're "in heavy equipment" but the dispatch loop pattern doesn't apply
- Worker count is unknown and the contact won't disclose it within first exchange
- The contact is procurement-led with no operational sponsor

---

## Gate 1 — First contact

**A lead clears Gate 1 when ALL of:**

- An outbound message has been sent using a template from `design-partner-outreach-messages.md`
- They have replied — silence is not a clear
- Their reply demonstrates they understood the positioning: DispatchTalon is decision-support, not payroll/Xero/compliance
- They have agreed to a 20-minute discovery call OR have asked specific operator-level questions that justify a longer thread

**Block exits if ANY of:**

- They are asking for things explicitly outside scope (payroll automation today, direct Xero sync today, compliance approval) and won't accept the boundary
- They want to "see a demo" without a discovery call — this is a soft block. Push for discovery first. If they refuse, send the public materials and step back; do not invest demo time without the call.

**Common stall patterns and the right response:**

- "Send me a deck" → send the README and pilot scope, then re-propose the call
- "We'll come back to you" with no specific date → send the second nudge; if no movement after the third, drop into the six-month re-engagement file
- "Talk to Steve, he handles that" → take the introduction, restart Gate 1 with Steve

---

## Gate 2 — Discovery

**A lead clears Gate 2 when ALL of:**

- A 30-minute call has happened
- The call followed `design-partner-discovery-call-script.md`, sections 1–12
- The lead has been scored against `design-partner-qualification-scorecard.md` and the score is recorded in `internal-lead-scoring-sheet.md`
- A risk-flag review is captured (any `wants-payroll`, `unreachable-DM`, etc. flagged)
- The total score is ≥ 20 — anything below 20 exits to polite decline

**A score of 20–29 means Testing Partner only.** Don't push them to a paid pilot because the score isn't there. A bad-fit paid pilot consumes more energy than a good-fit testing engagement.

**Block exits if ANY of:**

- The decision-maker wasn't on the call and isn't reachable for a follow-up call
- The data-readiness score is 1 (no worker list, no credentials, no role structure) — propose Testing Partner with workshop scope, not a paid pilot
- The risk-flag review surfaces a hard block (`wants-payroll` insistent, `single-system-mandate`, `legal-bound-confidentiality`)

---

## Gate 3 — Scope agreement

**A lead clears Gate 3 when ALL of:**

- The partner type proposed matches the qualification scorecard banding (40+ → Founding or Commercial, 30–39 → Labour, 20–29 → Testing)
- The pilot scope document (`design-partner-pilot-scope.md`) has been sent and they've read it
- They have verbally or in writing agreed to:
  - The setup and monthly fee for the proposed tier
  - The 90-day (or test-window) term
  - The feedback obligation (weekly or bi-weekly review)
  - The exclusion list (no SMS automation, no Xero/MYOB API, no payroll, no permit approval, etc.)
- They have provided OR committed in writing to provide:
  - Current worker list (any format)
  - A week's worth of jobs (any format)
- A specific kick-off date has been proposed

**Block exits if ANY of:**

- They want pricing below the tier's setup or monthly without compensating scope reduction — re-propose a smaller tier rather than discount
- They want a longer free period — Testing Partner max is 30 days; do not extend
- They want scope expansion ("can it also do payroll?") and won't accept the exclusion — defer or decline
- They want the agreement before scope is agreed — restart at scope, don't write a contract for an undefined deal

---

## Gate 4 — Pilot live

**A lead clears Gate 4 when ALL of:**

- A final agreement has been signed by both parties (lawyer-reviewed on both sides for any Founding / Commercial tier; lawyer-reviewed on Pressure Systems' side for Labour and above)
- Initial fees per the tier have been invoiced and (for Labour and above) paid
- Tenant has been provisioned on Fly.io and tested for first login
- Initial worker list has been imported
- A week of sample jobs has been seeded so the system isn't empty
- Build My Business setup is at least partially configured before kick-off
- A 90-minute kick-off session is on the calendar
- Baseline metrics for the partner's current process are captured (`design-partner-success-metrics.md` baselines)

**Block exits if ANY of:**

- Agreement is unsigned — do not provision live tenant access until signature is on file
- Setup fee unpaid by kick-off (Labour and above) — defer kick-off
- Worker list hasn't arrived — defer kick-off, do not skip
- Baseline metrics not captured — schedule the baseline-capture call first

---

## Pilot in flight — gate monitoring during the 90 days

A pilot in flight has weekly health checks. None of these are formal gates but they are decision points.

### Week 1 health check
- Did login work for all named users?
- Were the first three jobs created in the system rather than in the old tool?
- Did the dispatcher run at least one allocation through DispatchTalon?

If any of those are no, the kick-off didn't take. Schedule a re-kick rather than waiting.

### Week 4 health check
- Are operational metrics at or above the targets in `design-partner-success-metrics.md`?
- Has the partner attended every scheduled review?
- Has any quality metric started to move?

If two of those are no, escalate at the week 4 review. Honest conversation about whether to continue, restart, or exit.

### Week 6 mid-pilot review
- Held per `design-partner-feedback-framework.md` "Mid-pilot review" section
- Joint decision: continue as-is, continue with revised scope, or exit early

### Week 10 commercial check
- Continuation conversation initiated
- Partner indicates likely yes / no / maybe + named conditions
- If yes, agreement re-engaged with lawyer; if no, exit plan started

### Week 12 exit review
- Held per `design-partner-feedback-framework.md` "Exit review" section
- Outcome captured in `design-partner-success-metrics.md` format
- Continuation decision finalised
- Data export issued
- Lead sheet updated to `exited`

---

## Hard-stop conditions — terminate the pilot regardless of stage

If any of these occur, terminate the pilot. The cost of continuing is higher than the cost of exiting.

- Partner makes a public claim that DispatchTalon "ensures compliance," "guarantees safety," "replaces payroll," or any equivalent
- Partner makes a public claim that DispatchTalon "approves a dispatch" rather than "supports the decision"
- A regulator-related incident occurs and the partner attempts to attribute the decision to DispatchTalon
- Partner shares tenant credentials outside the agreed user list
- Partner attempts to extract source code, reverse engineer, or copy workflow models
- Partner consistently no-shows reviews — three consecutive misses without rescheduling

**Termination process:** Written notice citing the clause. Data export issued within 5 business days. Lessons captured for the backlog. Lead sheet stage moves to `exited` with the reason recorded.

---

## What this document is not

- Not a sales playbook — that's the rest of the pack
- Not a contract — that's `design-partner-agreement-outline.md` plus lawyer review
- Not a success rubric for pilots — that's `design-partner-success-metrics.md`
- Not a customer journey map — these are operational gates, not behavioural states

---

*Gates exist to be honest, not to slow things down. A lead that flies through Gate 0 to Gate 4 in three weeks is a good thing, provided every gate was actually passed. The risk to avoid is the slow drift through gates with no clear pass — that wastes more time than the strict version.*
