# DispatchTalon Lead Funnel System

**Status:** Internal operating reference | May 2026
**Owner:** Pressure Systems
**Classification:** Internal — not for public distribution
**Companion to:** `DISPATCHTALON_MASTER_OPERATING_DOCTRINE.md`, `sales/dispatchtalon-design-partner-pack/`

---

## How to use this document

This document is the complete lead-to-pilot-to-commercial-outcome operating system. Work it front-to-back for a new lead. Jump to a specific stage if a lead is already in the funnel.

The companion operational tools live in `sales/dispatchtalon-design-partner-pack/`. This document is the logic layer; those files are the execution layer.

---

## Part 1 — Lead Funnel Stages

### Stage 1: Awareness

**Goal:** The target is aware that DispatchTalon exists in their sector.

**Buyer state:** Has no specific problem framed yet; may have seen a LinkedIn post, been referred, or responded to cold outreach.

**Seller action:**
- For cold targets: publish sector-relevant content (LinkedIn carousel, post) or send a cold message using Template C from `design-partner-outreach-messages.md`
- For warm/referral targets: send a warm DM using Template A
- For Formspree inbound: respond within 4 hours using the inbound response template

**Required asset:** `design-partner-outreach-messages.md` templates

**Success signal:** They engage — reply, comment, ask a question

**Failure signal:** No reply after three nudges → move to 6-month re-engagement file

**Next action:** Move to Stage 2 if reply received; park if three nudges expire

---

### Stage 2: Curiosity

**Goal:** The target is asking about the problem, not just the product.

**Buyer state:** Knows what sector DispatchTalon operates in. Beginning to connect the pitch to their own operations.

**Seller action:**
- Ask the three diagnostic questions: (1) Where does the job first land? (2) How do you check tickets? (3) Where is the reason for your allocation recorded?
- Listen. Do not pitch features yet.
- If they are asking about payroll, Xero, or compliance — set the boundary immediately and gently

**Required asset:** Three diagnostic questions (Section 10 of Master Doctrine)

**Success signal:** They articulate a specific process pain in their own words

**Failure signal:** Replies indicate interest but only in out-of-scope features (payroll, Xero, compliance). If insistent → flag `wants-payroll` or `wants-xero`, consider Testing Partner only or decline.

**Next action:** Propose the 20-minute discovery call if any diagnostic question reveals a real problem

---

### Stage 3: Problem recognition

**Goal:** The target articulates their dispatch pain in their own words. Get the verbatim quote.

**Buyer state:** Recognises that their current process has a real cost or risk. May not yet understand how DispatchTalon specifically addresses it.

**Seller action:**
- Reflect back: "So the way it works today is X — and that creates Y every time you have Z?"
- Confirm the problem is in scope: allocation decision, credential checking, role coverage, audit trail
- Do not solve the problem yet. Confirm you understand it.

**Required asset:** None — this is a listening stage

**Success signal:** Verbatim quote from the target describing their pain. Record it in the lead sheet.

**Failure signal:** "We manage fine. Just curious." → score as pain severity 1–2; do not invest further without a different signal

**Next action:** Book the 30-minute discovery call

---

### Stage 4: Qualification

**Goal:** Lead scored ≥14 on the /25 scorecard.

**Buyer state:** Has expressed enough signal to warrant a structured call.

**Seller action:**
- Score from public knowledge: LinkedIn role, company size, visible plant, dispatch clues on website
- Score pain at 2–3 conservatively until the call confirms otherwise
- Score feedback willingness at 2–3 until call confirms
- Score decision-maker access and commercial seriousness from public signals
- Record in `internal-lead-scoring-sheet.md` with all risk flags identified

**Required asset:**
- `sales/dispatchtalon-design-partner-pack/design-partner-qualification-scorecard.md`
- `sales/dispatchtalon-design-partner-pack/internal-lead-scoring-sheet.md`
- `sales/dispatchtalon-design-partner-pack/first-5-lead-qualification-sheet.md` (for the first five)

**Scoring model:**

| Dimension | 1 | 3 | 5 |
|-----------|---|---|---|
| Pain severity | Mild curiosity | Clear friction, not urgent | Urgent — system failing |
| Decision-maker access | Unknown contact | Can influence, not approve | Owner / ops decision-maker |
| Feedback willingness | Unlikely | Willing after demo | Highly engaged design partner |
| Support burden risk | Chaotic, expects free | Manageable | Clean, realistic expectations |
| Commercial seriousness | Tyre kicker | Possible paid pilot later | Can approve now |

**Success signal:** Total score ≥14; fit category assigned; next action set with date

**Failure signal:** Score <10 → decline politely using template B4

**Next action:**

| Score | Next action |
|-------|-------------|
| 22–25 | Book discovery call within one week |
| 18–21 | Book discovery call within two weeks |
| 14–17 | Send context-first email; propose Testing Partner |
| 10–13 | Defer / nurture; 6-month timer |
| <10 | Decline politely |

---

### Stage 5: Discovery call

**Goal:** 30-minute call completed using the discovery script. Score updated. Tier confirmed.

**Buyer state:** Curious and willing to explore. Has not yet seen a demo or a price.

**Seller action:**
1. Follow `design-partner-discovery-call-script.md` sections 1–12
2. Cover all twelve questions (or score zero on missing ones)
3. Record verbatim quotes for the three most important pain points
4. Do not demo during the discovery call — listen first
5. Identify risk flags
6. Within 30 minutes of call: update score, update stage, set next action
7. Send post-call follow-up within 4 hours using the correct template B1/B2/B3/B4/B5

**Required asset:**
- `design-partner-discovery-call-script.md`
- `design-partner-follow-up-templates.md` (templates B1–B5)

**Key discovery questions:**

| # | Question | What it reveals |
|---|---------|-----------------|
| 1 | Where does the job first land? | Current intake method |
| 2 | What do you use today? | Current tooling |
| 3 | Who selects the worker and how? | Decision process |
| 4 | How do you check tickets? | Credential method |
| 5 | Multi-skilled workers? | Role-coverage opportunity |
| 6 | Four roles / fewer people? | Core wedge resonance |
| 7 | Fatigue / consecutive shifts? | FatigueGuard relevance |
| 8 | Where is the allocation reason recorded? | Audit gap |
| 9 | Worker notification method? | Notification method |
| 10 | How does admin get allocation data? | Retyping pain |
| 11 | What would make a 90-day pilot worth continuing? | Commercial intent |
| 12 | Who signs off on new software? | Decision-maker access |

**Success signal:**
- All 12 questions covered (or scored zero on skipped)
- Score updated within 30 minutes
- Post-call follow-up sent within 4 hours
- Stage moved to `discovery-done` or `scoring-done`

**Failure signal:**
- Decision-maker not on the call → send template B5 (deferred — request owner call)
- Score drops below 14 after the call → send template B4 (polite decline)
- Risk flags surface a hard block → decline or Testing Partner only

**Gate 2 pass condition:** Score ≥20. Score 20–29 → Testing Partner. Score 30+ → paid pilot eligible.

---

### Stage 6: Pilot fit

**Goal:** Tier matched and pilot scope sent. Partner has read the scope.

**Buyer state:** Has heard the post-call follow-up. Understands the shape of the pilot being proposed. Has not yet agreed to price.

**Seller action:**
1. Match tier to scorecard banding:
   - Score 40–50 → Founding or Commercial Pilot
   - Score 30–39 → Labour Allocation Pilot
   - Score 20–29 → Testing Partner
2. Send the relevant pilot scope from `design-partner-pilot-scope.md`
3. Include the hard exclusion list clearly (no payroll, no SMS auto-send, no Xero/MYOB API)
4. Do not include price in the scope document — price comes in the follow-up after the partner reads the scope

**Required asset:**
- `design-partner-pilot-scope.md`
- `design-partner-follow-up-templates.md` template B1, B2, or B3

**Success signal:** Partner reads the scope and asks specific questions (not about out-of-scope items)

**Failure signal:**
- Partner reads scope and immediately asks about Xero integration → re-state boundary; consider exit
- Partner wants to expand scope before agreeing to existing scope → decline scope expansion, re-propose tier
- Partner wants price before reading scope → ask them to read scope first; price follows scope

---

### Stage 7: Design partner agreement

**Goal:** Scope and pricing agreed in writing. Agreement outline sent and lawyer-reviewed.

**Buyer state:** Has read the scope. Is asking about pricing and terms.

**Seller action:**
1. Confirm pricing matches the tier from the scorecard (do not discount without explicit reason)
2. Confirm pricing with Cody before sending any number in writing
3. Send scope + agreement outline + success metrics package (template C1)
4. Both parties engage their lawyers to review the agreement outline
5. Final agreement prepared, reviewed, and sent for signature

**Required asset:**
- `design-partner-agreement-outline.md` (with "NOT LEGAL ADVICE" header)
- `design-partner-pilot-scope.md` (relevant tier)
- `design-partner-success-metrics.md`
- `design-partner-follow-up-templates.md` template C1

**Gate 3 pass conditions (ALL must be met):**
- [ ] Partner type matches scorecard banding
- [ ] Partner has read the pilot scope
- [ ] Partner has verbally or in writing agreed to: fee, 90-day term, feedback obligation, exclusion list
- [ ] Partner has committed to provide worker list and a week of jobs
- [ ] A specific kick-off date has been proposed

**Block conditions:**
- Pricing below tier minimum → re-propose a smaller tier; do not discount
- Wants longer free period → Testing Partner max 30 days; no extension
- Wants scope expansion → defer or decline; do not modify pilot scope mid-negotiation
- Wants agreement before scope is agreed → restart at scope; do not send agreement for undefined deal

---

### Stage 8: Tenant setup

**Goal:** Tenant live, worker list imported, system ready for kick-off.

**Buyer state:** Agreement signed. Eager but uncertain about setup complexity.

**Seller action:**
1. Provision tenant on Fly.io
2. Test first login
3. Issue admin credentials (pre-set password, forces rotation on first login)
4. Import worker list
5. Configure Build My Business
6. Set up requirement catalogue
7. Seed sample jobs (so the system is not empty at kick-off)
8. Configure Build My Business setup at least partially before kick-off
9. Send tenant-ready notification using template C2
10. Schedule 90-minute kick-off session

**Required asset:**
- `design-partner-follow-up-templates.md` template C2

**Gate 4 pass conditions (ALL must be met):**
- [ ] Agreement signed by both parties
- [ ] Setup fee invoiced (and paid, for Labour Allocation tier and above)
- [ ] Tenant provisioned and tested for first login
- [ ] Worker list imported
- [ ] Sample jobs seeded
- [ ] Build My Business at least partially configured
- [ ] 90-minute kick-off on the calendar
- [ ] Baseline metrics captured

**Block conditions:**
- Agreement unsigned → do not release live tenant access
- Setup fee unpaid by kick-off (Labour and above) → defer kick-off
- Worker list not received → defer kick-off; do not skip
- Baseline metrics not captured → schedule baseline capture call first

---

### Stage 9: Active pilot

**Goal:** Jobs created in DispatchTalon. Real allocation decisions happening in the system.

**Buyer state:** Using the system. Forming early opinions. Trust is fragile in weeks 1–3.

**Seller action:**
1. **Week 1 health check:**
   - Did login work for all named users? If no → re-kick within 48 hours
   - Were the first three jobs created in DispatchTalon? If no → call the dispatcher directly
   - Did the dispatcher run at least one allocation through DispatchTalon? If no → re-kick, not wait
2. **Week 4 health check:**
   - Operational metrics at or above targets?
   - Every scheduled review attended?
   - Any quality metric starting to move?
   - If two of three are no → honest conversation at week 4 review; decide continue / restart / exit
3. **Week 6 mid-pilot review:**
   - Held per `design-partner-feedback-framework.md` "Mid-pilot review" section
   - Joint decision: continue as-is / continue revised scope / exit early

**Required asset:**
- `design-partner-feedback-framework.md`
- `design-partner-success-metrics.md`
- `design-partner-follow-up-templates.md` templates D1, D2, D3

---

### Stage 10: Weekly review

**Goal:** Regular feedback cadence maintained. Outcomes being measured weekly.

**Buyer state:** Either engaged (reviews held, feedback captured) or drifting (reviews skipped, usage sparse).

**Seller action:**
1. Send review reminder 24 hours before each review (template D1)
2. Send confirmation note within 4 hours after review (template D2)
3. Update all metrics in the success metrics record
4. Track: last review held, any missed reviews, pattern of usage

**Hard-stop trigger:** Three consecutive review misses without rescheduling → initiate hard-stop process

---

### Stage 11: Exit review

**Goal:** Outcomes measured. Continuation decision made. Data exported.

**Buyer state:** Evaluating the pilot against their expectations. Deciding whether to continue.

**Seller action:**
1. **Week 10 commercial check:**
   - Initiate continuation conversation: yes / no / maybe + named conditions
   - If yes → engage lawyer for new agreement
   - If no → start exit plan

2. **Week 12 exit review:**
   - Hold per `design-partner-feedback-framework.md` "Exit review" section
   - Capture outcome in `design-partner-success-metrics.md` format
   - Issue data export within 5 business days
   - Update lead sheet to `exited`

**Required asset:**
- `design-partner-feedback-framework.md`
- `design-partner-success-metrics.md`
- `design-partner-follow-up-templates.md` templates E1, E2, or E3

**Outcome bands:**

| Band | Operational | Quality | Commercial | Response |
|------|-------------|---------|-----------|---------|
| Strong | All hit | 3+ of 5 | Continue + pay + case study | Template E1 |
| Workable | Mostly hit | 1–2 of 5 | Continue + pay | Template E2 |
| Inconclusive | Activity low | Mixed | Will think about it | Restart or template E3 |
| Failed | Zero activity | No improvement | No continuation | Template E3 + data export |

---

### Stage 12: Commercial outcome

**Goal:** Paid continuation or structured exit with a captured learning and referral.

**Buyer state:** Either committing to ongoing use or leaving with data and a clear understanding of what the next step is.

**Seller action:**
- If continuing: re-engage lawyer; provision ongoing tenant; issue new agreement
- If exiting: issue data export within 5 business days; capture lessons; record in backlog
- Whether continuing or exiting: ask for one referral name
- Set 6-month re-engagement timer if exiting (template F1)

**Required asset:**
- `design-partner-follow-up-templates.md` templates E1–E4, F1
- `design-partner-agreement-outline.md` (for continuation agreement)

---

## Part 2 — Risk Flag Dictionary

Use these exact strings in `internal-lead-scoring-sheet.md` so filtering works.

| Flag | Meaning | Default response |
|------|---------|-----------------|
| `wants-payroll` | Expects payroll automation inside the pilot | Decline that scope; consider Testing only |
| `wants-xero` | Expects direct Xero integration | Position as CSV handoff; deprecate if insistent |
| `wants-mob-app` | Expects native mobile app today | Position PWA on roadmap; do not commit |
| `unreachable-dm` | Decision-maker not on calls | Park until access changes |
| `expects-free-forever` | Explicitly said they expect free | Testing only, time-boxed |
| `procurement-led` | Procurement-driven, not operator-driven | Slow-track |
| `single-system-mandate` | Wants to replace everything | Decline |
| `legal-bound-confidentiality` | Cannot anonymise learnings | Decline or scope around it |
| `no-weekly-jobs` | Job volume too low to test workflow | Park |
| `wrong-size-too-small` | <10 workers, <3 jobs/week | Park |
| `wrong-size-too-large` | >250 workers | Commercial Pilot only |
| `competitor-overlap` | Already on FCC/EQUIPR and content | Park 6 months |
| `champion-only` | One enthusiastic contact, no traction | Build second contact before progressing |

---

## Part 3 — Stage Transition Rules

No skipping. Each transition has a gate condition.

| Transition | Gate condition |
|-----------|----------------|
| `new` → `contacted` | Outbound sent using an approved template from `design-partner-outreach-messages.md` |
| `contacted` → `discovery-booked` | Reply received AND reply confirms they understand DispatchTalon is decision-support, not payroll/Xero/compliance |
| `discovery-booked` → `discovery-done` | 30-minute call held following script; all 12 sections covered or scored zero on missing |
| `discovery-done` → `scoring-done` | Score captured within 30 minutes of call ending; recorded in sheet |
| `scoring-done` → `scope-sent` | Score ≥20; decline sent if <20 using template B4 |
| `scoring-done` → decline | Score 14–19 → Testing Partner; score <14 → polite decline |
| `scope-sent` → `agreement-sent` | Verbal yes on scope and pricing; do not send agreement to "see if they bite" |
| `agreement-sent` → `signed` | Both parties' lawyers reviewed; signed agreement on file |
| `signed` → `live` | Tenant provisioned; worker list imported; kick-off held; baseline metrics captured |
| `live` → `exited` | Exit review held; outcome record complete; data export issued |

---

## Part 4 — Outbound Hygiene Rules

1. One channel at a time (email then LinkedIn then call — not all three in 24 hours)
2. Maximum three nudges on cold outreach; after three, defer to 6-month re-engagement file
3. Never attach the agreement on a first message
4. Never quote a price without the scope alongside it
5. Banned vocabulary applies to every outbound message — no exceptions
6. Every outbound action is logged in the lead sheet with date and channel
7. No outbound capacity more than 10 new `new` → `contacted` transitions per week; quality over volume

---

## Part 5 — Monday Morning Triage (10 minutes)

1. Open the first-5 sheet (or full lead sheet when pipeline > 5).
2. For each row: did last week's action happen? Update.
3. Is there a new next action? Set it with a date.
4. Has the stage moved? Update.
5. Has the row been dormant >30 days without movement? Move to re-engagement unless a live pilot.
6. Sort by score descending for everyone in `discovery-done` or later.
7. Commit to no more than 2 active outbound moves per lead this week.
8. Confirm: are the top five leads the right five? If not, replace the weakest with a stronger candidate.

---

*The funnel exists to prevent the two worst outcomes in founder-led sales: spending time on leads that will never convert, and failing to follow up on leads that would have converted with one more structured contact. Every stage gate and every transition rule exists to force an honest decision at the right moment.*
