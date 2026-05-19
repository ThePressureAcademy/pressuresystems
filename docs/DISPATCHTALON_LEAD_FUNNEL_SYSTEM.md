INTERNAL ONLY — NOT FOR PUBLIC DISTRIBUTION

Product: DispatchTalon by Pressure Systems
Status: Internal operating doctrine
Use: For DispatchTalon workers, agents, implementation partners, sales operators, support operators, and founder-led commercialisation.
Public use: Not approved.
Pricing: Internal working model only.
Legal: Not legal advice. Not compliance advice. Not engineering advice.

Current route note: The public product route may still use `/liftiq/` for legacy stability, but the current product brand is DispatchTalon. LIFTIQ references should be treated as historical/legacy route context only.

---

# DispatchTalon — Lead Funnel System

| Field | Value |
|---|---|
| Last reviewed | 2026-05-20 |
| Owner | Cody / Pressure Systems |
| Update trigger | Any PR changing design-partner terms, pricing, public homepage, outreach templates, or sign-off gates |
| Not public use | Funnel logic is internal sales operations only |
| Claim boundary reminder | Sales conversations must stay inside decision-support framing; no compliance, safety, payroll, or engineering claims |
| Companion docs | `docs/dispatchtalon-design-partner-gate-criteria.md`, `sales/dispatchtalon-design-partner-pack/`, `docs/DISPATCHTALON_COMMERCIALISATION_SIGNOFF.md` |

---

## 1. Funnel Stages

The funnel runs from awareness through paid continuation. Each stage has a buyer state, a seller action, a required asset, a success signal, a failure signal, and a next action.

### Stage 1 — Awareness

| Field | Value |
|---|---|
| Buyer state | Has not heard of DispatchTalon; may be aware of a generic "dispatch tool" category |
| Seller action | Place positioning content where the buyer already is (sector forums, founder networks, warm intros) |
| Required asset | Approved one-liner; sector-relevant short post |
| Success signal | Inbound enquiry, profile view, or warm intro request |
| Failure signal | Silence after repeated placement; off-sector engagement only |
| Next action | Move qualified contact to Stage 2; otherwise refine placement |

### Stage 2 — Sourcing (Gate 0)

| Field | Value |
|---|---|
| Buyer state | Named contact with sector fit identified |
| Seller action | Add to lead sheet; verify sector, worker count, and competitor overlap |
| Required asset | Lead sheet row with all gate-0 fields populated |
| Success signal | Contact passes gate 0 criteria in the design-partner gate doc |
| Failure signal | Generic info@ inbox, unknown worker count, procurement-only contact |
| Next action | Send approved outbound message; otherwise block exit |

### Stage 3 — First Contact (Gate 1)

| Field | Value |
|---|---|
| Buyer state | Approached but not yet engaged |
| Seller action | Send outbound from approved templates; track reply |
| Required asset | Approved outreach template; reply log |
| Success signal | Reply demonstrates correct positioning (decision-support, not payroll/compliance) |
| Failure signal | Demands demo without discovery; asks for out-of-scope features and refuses boundary |
| Next action | Book discovery call; otherwise send public materials and step back |

### Stage 4 — Discovery (Gate 2)

| Field | Value |
|---|---|
| Buyer state | On a call; describing their dispatch loop |
| Seller action | Score against tier and scoring model; capture pain, scale, sponsor, timing |
| Required asset | Discovery question set; scoring sheet |
| Success signal | Score meets tier threshold; operational sponsor identified |
| Failure signal | No operational sponsor; pain is upstream of dispatch loop; scale outside band |
| Next action | Propose scope and pricing in writing; otherwise mark out-of-fit and close |

### Stage 5 — Scope Agreement (Gate 3)

| Field | Value |
|---|---|
| Buyer state | Reviewing written scope and pricing |
| Seller action | Confirm scope inside product capability map; confirm pricing inside internal working model; capture written yes |
| Required asset | Scope letter; design-partner terms |
| Success signal | Written yes to scope and pricing |
| Failure signal | Negotiation drifts into out-of-scope features or below floor pricing |
| Next action | Provision tenant and schedule kick-off; otherwise re-scope or close |

### Stage 6 — Pilot Live (Gate 4)

| Field | Value |
|---|---|
| Buyer state | Agreement signed; tenant provisioned; kick-off held |
| Seller action | Hand off to implementation; remain accessible for executive escalation |
| Required asset | Provisioned tenant; implementation playbook in motion |
| Success signal | Worker import complete; first allocation published in pilot tenant |
| Failure signal | Implementation stalls past stage 4 of the playbook |
| Next action | Move to Stage 7 once allocation loop is running; otherwise escalate to Cody |

### Stage 7 — Pilot Active

| Field | Value |
|---|---|
| Buyer state | Using DispatchTalon for live allocations |
| Seller action | Weekly check-in; capture friction; feed product feedback loop |
| Required asset | Weekly check-in template; product feedback log |
| Success signal | Allocations published weekly; exceptions trending down |
| Failure signal | Usage stops; SmartRank overrides without reason; silent week |
| Next action | Continue weekly; surface blockers; prepare success-metrics review |

### Stage 8 — Success Metrics Review (Week 12)

| Field | Value |
|---|---|
| Buyer state | 12 weeks into pilot |
| Seller action | Evaluate against success-metrics exit criteria in the design-partner pack |
| Required asset | Metrics review template |
| Success signal | Metrics meet exit criteria; sponsor wants continuation |
| Failure signal | Metrics miss; sponsor cannot articulate continuation case |
| Next action | Propose paid continuation; otherwise structured exit |

### Stage 9 — Paid Continuation

| Field | Value |
|---|---|
| Buyer state | Pilot succeeded; ready to convert |
| Seller action | Convert to paid terms inside internal working model |
| Required asset | Paid continuation agreement |
| Success signal | Signed paid agreement; first invoice paid |
| Failure signal | Conversion stalls past 30 days post-review |
| Next action | Move to standard customer success; otherwise structured exit and lessons-learned writeup |

---

## 2. Lead Qualification Columns

The lead sheet must carry, at minimum, these columns:

| Column | Notes |
|---|---|
| Lead ID | Stable internal identifier |
| Company name | Trading name |
| Sector | Crane / rigging / labour-hire / plant / adjacent |
| Worker count band | 5–14 / 15–40 / 41–100 / 101–250 / >250 |
| Contact name | Named person |
| Contact role | Operational sponsor / owner / procurement / other |
| Contact channel | Email / phone / both |
| Source | Inbound / outbound / referral / event |
| Gate state | 0 / 1 / 2 / 3 / 4 / pilot-active / week-12 / paid / closed |
| Score | Numeric (see scoring model) |
| Tier | A / B / C / D (see tier logic) |
| Competitor overlap | None / partial / signed-renewal |
| Last touch date | ISO date |
| Next action | Specific, dated |
| Next action owner | Name |
| Notes | Plain-language context |

No field is optional once a lead has cleared Gate 0.

---

## 3. Scoring Model

A simple additive score, capped at 100. The score is a sorting aid; tier logic and gate state are the actual decision inputs.

| Factor | Max points |
|---|---|
| Sector fit | 20 |
| Worker count in 15–40 sweet spot | 15 |
| Worker count in 5–14 or 41–100 acceptable bands | 8 |
| Operational sponsor identified | 15 |
| Named contact with channel | 10 |
| Inbound / warm intro source | 10 |
| Pain articulated inside dispatch loop | 15 |
| Stated timing within 90 days | 10 |
| Competitor overlap (none) | 5 |
| Competitor overlap (signed renewal) | negative — block exit |

Rules:

- A score above 70 with gate progress stalled is a follow-up priority, not an automatic promotion.
- A score below 40 should not consume discovery-call time without Cody's review.
- Scores are recomputed at each touch.

---

## 4. Tier Logic

| Tier | Definition | Cadence |
|---|---|---|
| A | Score ≥ 70, gate ≥ 2, operational sponsor confirmed | Weekly contact, founder-involved |
| B | Score 55–69, gate ≥ 1, sector fit confirmed | Bi-weekly contact |
| C | Score 40–54 or gate 0 with sector fit | Monthly nurture |
| D | Score < 40 or unclear fit | Quarterly check or close |

Tier is reassessed at every touch. Movement between tiers is recorded in the notes column.

---

## 5. Weekly Review Cadence

Every Monday (or first working day):

1. Pull the lead sheet.
2. For each Tier A and B lead: confirm next action and owner are current.
3. For each lead at Gate 2 or higher with no movement in 14 days: flag for explicit decision (push, pause, close).
4. For each lead at Gate 3 or higher: review against design-partner terms and pricing model.
5. Update the score and tier columns.
6. Record the review in the sales operations log.

The weekly review is the single source of pipeline truth. Anything not in the lead sheet at review time is treated as not in the pipeline.

---

## 6. First-Five Lead Sheet Relationship

The lead funnel and the **first-five lead sheet** are linked:

- The first-five lead sheet is a focused subset: the five leads currently closest to becoming live design partners.
- A lead joins the first-five sheet when it reaches Tier A and Gate ≥ 2.
- A lead leaves the first-five sheet when it converts to paid continuation, structurally exits, or is overtaken by a stronger candidate.
- The first-five sheet is reviewed at every weekly cadence and at any commercialisation sign-off review.
- The full lead funnel is the long-form pipeline; the first-five sheet is the operational focus.

If the first-five sheet is ever empty, sourcing is broken and outbound work takes priority over every other sales activity that week.
