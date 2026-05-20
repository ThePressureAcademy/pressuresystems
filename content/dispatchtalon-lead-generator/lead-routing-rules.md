# Lead Routing Rules

Internal sales asset. How a completed Dispatch Readiness Diagnostic, combined with the submitted operational context, routes into a pilot type or a nurture path.

Companion files:

- `score-logic.md` for band definitions.
- `follow-up-framework.md` for the scripts that run after routing.
- `docs/DISPATCHTALON_LEAD_FUNNEL_SYSTEM.md` for the wider funnel context.

Routing is a sorting decision, not a sales decision. The sales conversation happens in follow up. Routing only answers two questions: which pilot type best fits this lead, and which queue do they enter.

---

## The five destinations

| Destination | What it is | Who runs it | Cadence |
|---|---|---|---|
| Testing Partner | Small operator, low risk, low scope. Used to validate the product loop without commercial pressure. | Cody | Light, monthly check in |
| Labour Allocation Pilot | Labour heavy operator. Focus is role coverage and credential surfacing. No plant complexity. | Cody | Weekly during pilot window |
| Founding Partner Pilot | Plant plus labour operator. Full role coverage, multi-role suggestions, audit, exports. | Cody | Weekly during pilot window |
| Commercial Pilot | Mature operator, multi-branch or formal evaluation. Treated as evaluation-grade. | Cody | Structured per pilot terms |
| Nurture or park | Lead is real but not ready. Revisit on a dated trigger. | Cody | 60 to 90 day revisits |

A sixth modifier sits on top of any destination:

- Managed support add on. Applied when the lead signals a high support burden during context submission.

---

## Inputs the routing uses

Every routing decision uses five inputs from the lead capture form, plus the score band:

1. Score band. 1 to 4 per `score-logic.md`.
2. Workers or personnel. 1 to 5, 6 to 14, 15 to 40, 41 to 80, 81 to 150, 150 plus.
3. Assets or plant. Labour only, 1 to 5 plant, 6 to 15 plant, 16 to 40 plant, 40 plus plant.
4. Weekly jobs. Under 10, 10 to 25, 26 to 60, 61 to 120, 120 plus.
5. Role of the lead. Owner, Operations Manager, Dispatcher or Allocator, General Manager, Office or Admin, Other.
6. Main pain. Free text. Used to detect support burden, scope mismatch, or out of scope intent.

---

## Routing matrix

Read the matrix as a sequence. Match the first row that fits. If none match, use the default at the bottom.

| Score band | Workers | Plant | Weekly jobs | Decision-maker reachable | Route to |
|---|---|---|---|---|---|
| 1 | Under 10 | Any | Under 10 | Any | Nurture. Testing Partner only if explicitly requested. |
| 1 | 10 to 40 | Any | Any | Yes | Testing Partner |
| 1 | 41 plus | Any | Any | Yes | Testing Partner. Flag for re-scoring after first call. |
| 2 | 15 to 50 | Labour only | 10 to 60 | Yes | Labour Allocation Pilot |
| 2 | 25 to 100 | Plant plus labour | 10 to 60 | Yes | Labour Allocation Pilot, escalate to Founding Partner if scope grows |
| 2 | 41 to 150 | Any | 26 plus | Yes | Founding Partner Pilot candidate |
| 3 | 15 to 50 | Labour only | 26 plus | Yes | Labour Allocation Pilot, scoped tightly |
| 3 | 25 to 100 | Plant plus labour | 26 plus | Yes | Founding Partner Pilot |
| 3 | Multi-branch | Any | Any | Yes | Commercial Pilot |
| 4 | Any | Any | Any | Yes | Commercial Pilot. Founding Partner if multi-branch. |
| Any | Any | Any | Any | No | Ask for an introduction to the decision-maker before routing. |
| Any | Any | Any | Any | Out of scope intent | Disqualify per the boundary rules. Close the loop cleanly. |

Default if nothing matches: Nurture for 60 days, then re-evaluate.

---

## Decision-maker reachability

The lead capture form records a role. Translate that role into a reachability state before routing:

- Owner. Decision-maker reachable.
- General Manager. Decision-maker reachable in most operators.
- Operations Manager. Decision-maker reachable for operations scope. Owner approval may still be required for commercial scope.
- Dispatcher or Allocator. Influencer, not decision-maker. Ask for an owner or ops manager introduction.
- Office or Admin. Influencer at best. Ask for an owner introduction.
- Other. Ask in the first reply.

If the decision-maker is not reachable, do not route to a pilot. Route to a single follow up that asks for the introduction, then place the lead in a holding state.

---

## Out of scope detection

Inspect the main pain field for any of these signals and disqualify cleanly rather than routing:

- Wants autonomous dispatch with no human in the loop.
- Wants a payroll system or to replace Xero or MYOB.
- Wants a permit, compliance, or lift-engineering authority.
- Wants a free unlimited support contract.
- Wants invoice generation or accounts receivable.
- Wants direct live SMS sending as a guaranteed delivery channel.

Reply once, name why DispatchTalon is not the right fit today, and remove from the active funnel. Do not place into nurture. Do not auto-resend.

---

## Managed support add on trigger

Apply the Managed support add on modifier to any route when at least one of these is true:

- Main pain mentions "we do not have anyone to run this" or similar.
- The lead is owner-only with no ops manager and the operation has more than 25 workers.
- The lead has been through one or more tools in the same space and the failure mode was "no one drove it internally."
- The lead asks for done with you or done for you onboarding in the first reply.

Flag in the lead sheet as `managed-support-candidate` and surface it in the scoping note.

---

## Routing examples

These are illustrative, not real leads.

Example A. Owner of a 20 worker labour hire operator. Plant: labour only. Weekly jobs: 18. Score 28. Main pain: dispatcher leaves and we panic.

- Band 2. Labour only. 15 to 50 band. Owner reachable.
- Route: Labour Allocation Pilot.
- Modifier: none.
- First action: Day 0 Band 2 reply per `follow-up-framework.md`, framed for Labour Allocation Pilot.

Example B. Operations Manager of a 60 worker plant plus labour operator. Weekly jobs: 45. Score 41. Main pain: cannot reconstruct why a crew was picked when management asks.

- Band 3. Plant plus labour. 25 to 100 band. Ops manager reachable for operations scope.
- Route: Founding Partner Pilot.
- Modifier: none.
- First action: Day 0 Band 3 reply, framed for Founding Partner Pilot. Day 2 scoping note. Ask if owner sign off is needed before pilot start.

Example C. Dispatcher at a 12 worker plant plus labour operator. Weekly jobs: 8. Score 14. Main pain: spreadsheets are messy.

- Band 1. Plant plus labour. Under 10 jobs band. Decision-maker not reachable.
- Route: Hold. Ask for owner introduction.
- Modifier: none.
- First action: Reply with thanks and a single ask for an owner or ops manager introduction. Do not run the diagnostic call invite yet.

Example D. Owner of a 150 worker multi-branch crane operator. Weekly jobs: 110. Score 52. Main pain: evaluating three tools, need to know which one is real.

- Band 4. Multi-branch. Owner reachable.
- Route: Commercial Pilot.
- Modifier: possibly Managed support add on if scoping reveals limited internal driver capacity.
- First action: Day 0 Band 4 reply, framed for Commercial Pilot. Send design partner pack with the second message.

Example E. Owner of a 25 worker labour operator. Weekly jobs: 20. Score 19. Main pain: want autonomous dispatch so we do not need a dispatcher.

- Out of scope intent. Disqualify per the boundary rules.
- Reply once. Name the boundary plainly. Do not place in nurture.

---

## Lead sheet fields the router writes

Every routed lead must have these fields populated in the first-five lead sheet or the wider lead sheet, depending on tier:

- `lead_id`
- `name`
- `company`
- `contact_role`
- `score`
- `band`
- `workers_band`
- `plant_band`
- `weekly_jobs_band`
- `decision_maker_reachable`
- `route` (one of Testing Partner, Labour Allocation Pilot, Founding Partner Pilot, Commercial Pilot, Nurture, Hold, Disqualified)
- `modifier` (Managed support add on, or blank)
- `source_channel` (from the UTM)
- `next_action`
- `next_action_owner`
- `next_action_date`

If any field cannot be populated from the form submission, the router records "unknown" rather than guessing. Unknown values block tier promotion until clarified in the first reply.

---

## Promotion to the first-five lead sheet

A routed lead is promoted to the first-five lead sheet when all of the following are true:

- Route is Labour Allocation Pilot, Founding Partner Pilot, or Commercial Pilot.
- Decision-maker is reachable.
- Band is 2, 3, or 4.
- Out of scope intent is not present.
- A clear next action with a dated trigger exists.

If the first-five lead sheet is full, the lowest scoring or stalest entry is reviewed for demotion before the new entry is added. Promotion is never silent. Demotion is logged with a reason.

---

## Edit rules

- Do not introduce a new destination without a corresponding pilot type in the design partner pack.
- Do not promote a lead past Hold without a reachable decision-maker.
- Do not modify the routing matrix mid-campaign. Wait for the weekly review and update once.
- The matrix is a sorting aid. If a row clearly does not match real operator behaviour after 10 routed leads, change the matrix, do not work around it.
