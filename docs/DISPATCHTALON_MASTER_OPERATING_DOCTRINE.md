INTERNAL ONLY — NOT FOR PUBLIC DISTRIBUTION

Product: DispatchTalon by Pressure Systems
Status: Internal operating doctrine
Use: For DispatchTalon workers, agents, implementation partners, sales operators, support operators, and founder-led commercialisation.
Public use: Not approved.
Pricing: Internal working model only.
Legal: Not legal advice. Not compliance advice. Not engineering advice.

Current route note: The public product route may still use `/liftiq/` for legacy stability, but the current product brand is DispatchTalon. LIFTIQ references should be treated as historical/legacy route context only.

---

# DispatchTalon — Master Operating Doctrine

| Field | Value |
|---|---|
| Last reviewed | 2026-05-20 |
| Owner | Cody / Pressure Systems |
| Update trigger | Any PR changing worker system, job system, role coverage, SmartRank, CredentialGate, FatigueGuard, publish allocation, SMS provider handling, exports, public homepage, pricing, design-partner terms, or tenant/auth/security |
| Not public use | This document is not for prospects, customers, regulators, or partners outside the DispatchTalon internal operating circle |
| Claim boundary reminder | DispatchTalon is decision-support software. It is not a compliance system, not a payroll system, not a safety authority, and not a lift-engineering authority |

---

## 1. Executive Doctrine

DispatchTalon is decision-support for dispatchers, operations managers, and owners who allocate licensed workers (initially crane/rigging/labour-hire/plant) to short-lived jobs under credential, fatigue, and timing constraints.

The product exists to:

- Reduce the cognitive load of the dispatch loop.
- Surface conflicts (credential gaps, fatigue, timing, double-booking) before allocation is published.
- Keep an auditable record of why a worker was chosen.
- Free the operator to make the final human call.

DispatchTalon does **not**:

- Approve workers as legally compliant.
- Replace site-specific risk assessment.
- Replace payroll, timesheet, or finance systems.
- Issue, validate, or expire statutory tickets on behalf of any regulator.

The operator is always the decision-maker. The system is always the assistant.

---

## 2. Core Beliefs

1. **Decision-support beats automation in this sector.** Operators carry liability and context the system cannot see. The product augments judgement; it does not override it.
2. **The dispatch loop is the unit of value.** Everything (workers, jobs, credentials, SMS, exports) exists to make a single allocation defensible in under two minutes.
3. **Boundaries are a feature.** Refusing to claim compliance, payroll, or engineering authority is what makes the product trustable in adjacent regulated workflows.
4. **Audit beats prediction.** A clear record of who chose what and why is more valuable than a black-box recommendation.
5. **First-five customers shape the product.** Design-partner feedback outranks roadmap aesthetics until the product clears commercialisation sign-off.
6. **LIFTIQ is legacy route context.** The brand is DispatchTalon. Do not let internal docs, agents, or sales material drift back to LIFTIQ as the active brand.

---

## 3. Market Problem

Allocators in crane/rigging/labour-hire/plant operate under a recurring set of pressures:

- Short-notice jobs (often <24 hours) requiring a credentialed team.
- Workers with overlapping role/ticket combinations that are hard to track in spreadsheets.
- Fatigue, double-booking, and credential expiry risks that materialise only at the moment of allocation.
- Customer expectation of fast confirmation by SMS or phone.
- Finance/admin downstream requiring clean export of who worked, on what, when.
- No tool in the operator's daily stack is shaped around the dispatch loop. Spreadsheets, WhatsApp, paper diaries, and generic scheduling tools all leak information.

The result: a dispatcher's working memory is the system of record. When the dispatcher is sick, leaves, or makes one bad call, the cost is real.

DispatchTalon turns that working memory into a structured, auditable loop.

---

## 4. Product Capability Map

High-level capability surfaces (internal naming, not marketing language):

| Capability | Purpose |
|---|---|
| Worker system | Source of truth for workers, roles, credentials, contact, availability |
| Job system | Job records with role slots, timing, site, customer, status |
| Role coverage engine | Determines which workers can cover which role slots, including multi-role combinations |
| SmartRank | Ranks candidate workers per role slot using role fit, credential validity, fatigue state, history, and operator preference |
| CredentialGate | Blocks or warns when a candidate's required credential is missing, expiring, or expired |
| FatigueGuard | Surfaces fatigue conflicts (back-to-back shifts, insufficient rest, hours-of-work breaches) |
| Publish allocation | The act of committing a planned allocation and triggering downstream notification |
| SMS notification | Worker notification path; provider-handled, with internal abstraction |
| Exports | Read-only outputs for finance/admin (payroll handoff, timesheet handoff, audit handoff) |
| Build My Business setup | Initial tenant scaffolding (roles, credential types, sites, customers) |
| Audit log | Append-only record of allocation decisions and operator overrides |

Each capability has its own internal architecture doc under `docs/`. This master doctrine references them; it does not duplicate them.

---

## 5. Decision-Layer Architecture

The system is structured as a stack of decision layers. Each layer can reject, warn, or pass.

```
1. Eligibility    — Does the worker hold the role and a non-expired required credential?      (CredentialGate)
2. Availability   — Is the worker free for the job window?                                     (Calendar / shift state)
3. Fatigue        — Is the worker within fatigue limits for this window?                       (FatigueGuard)
4. Fit            — How well does this worker match the slot vs. other candidates?             (SmartRank)
5. Coverage       — Can multi-role combinations reduce the number of bodies on site?           (Role coverage engine)
6. Operator       — The dispatcher confirms, overrides with reason, or rejects                 (Human in the loop)
7. Publish        — Allocation is committed and notification path triggered                    (Publish allocation)
8. Audit          — The decision and any overrides are recorded                                (Audit log)
```

Doctrine:

- No layer above layer 6 can publish on its own.
- Overrides at layer 6 always require a reason captured into the audit log.
- Layer 7 is the only layer that triggers external messages.
- Layer 8 is the only source of truth for "what was decided and why."

---

## 6. Role Coverage Doctrine

Role coverage is the most product-distinctive capability. The doctrine:

- Multi-role coverage suggestions are **suggestions**, never automatic confirmations.
- A combined-role suggestion must surface a review warning when the combination has timing, supervision, or independence implications.
- Required credentials must be present, valid, and non-expired for every role being combined.
- The dispatcher's confirmation is required to commit any multi-role allocation with active warnings.
- The system does not claim a combined role is "safe" or "compliant." It claims only that the candidate holds the recorded roles and credentials.

Examples and full behaviour matrix live in `docs/dispatchtalon-role-coverage-examples.md` and the multi-role allocation architecture doc.

---

## 7. User Types and Training Paths

The product serves multiple user types. Each has a defined training path in `docs/DISPATCHTALON_TRAINING_CURRICULUM.md`.

| User type | Primary use of DispatchTalon |
|---|---|
| Dispatcher | Daily allocation loop, role coverage, publish |
| Operations manager | Weekly coverage health, exception handling, audit review |
| Company owner | Strategic visibility, exports, design-partner feedback loop |
| Admin / office user | Worker setup, credential entry, export to payroll/finance |
| DispatchTalon support worker | Triaging customer issues, escalating product defects, never invoicing or quoting |
| Sales lead | Discovery, scoring, gate progression, never overpromising scope |
| Implementation partner | Tenant scaffolding, training delivery, never substituting for legal/compliance advisors |
| AI agent | Bounded automation; rules in `docs/DISPATCHTALON_AGENT_SKILL.md` |
| Investor / grant reviewer | Read-only narrative; never operate live tenants |

---

## 8. Current Risks

Internal-only risk register (not exhaustive; not public):

| Risk | Why it matters | Mitigation track |
|---|---|---|
| Brand drift back to LIFTIQ | Confuses prospects and customers | Doctrine + agent rules treat LIFTIQ as legacy route only |
| Claim creep (compliance/safety/engineering) | Erodes trust and exposes product to liability framing | Claim-boundary reminders on every doctrine file; sales review |
| Operator over-trust of SmartRank | Operators stop reading warnings | UI surfaces warnings; audit log records overrides |
| Credential data staleness | Bad inputs cause confidently-wrong suggestions | CredentialGate expiry handling; admin training |
| SMS provider outage | Notifications fail silently | Provider abstraction; failure surfaces in dispatcher view |
| Export schema drift | Finance hand-offs break | Export architecture doc; schema versioning |
| Design-partner concentration | Roadmap captured by one customer | First-five lead funnel + sign-off gates |
| Founder bottleneck | Cody on critical path for too many decisions | Agent skill + implementation playbook reduce reliance |

---

## 9. Update Rule

This file must be reviewed after any PR changing:

- worker system
- job system
- role coverage
- SmartRank
- CredentialGate
- FatigueGuard
- publish allocation
- SMS provider handling
- exports
- public homepage
- pricing
- design-partner terms
- tenant/auth/security

Review means: read the file end-to-end, update the "Last reviewed" field, and amend any section that no longer matches the system. A PR that touches the trigger list but does not update this file should be blocked at review.

---

## 10. If All Else Is Lost

If every other doc in this set is missing, this is the recovery summary:

- The product is **DispatchTalon**. The legacy route is `/liftiq/`. Do not rebrand back.
- The product is **decision-support**, not compliance, not payroll, not engineering authority.
- The unit of value is **a defensible allocation in under two minutes**.
- The decision stack is **Eligibility → Availability → Fatigue → Fit → Coverage → Operator → Publish → Audit**.
- The **operator is always the decision-maker**. The system never publishes alone.
- The customer focus is **the first five design-partner pilots**. Their feedback outranks aesthetics.
- The **claim boundary is sacred**. We never claim to make a worker compliant, safe, or licensed.
- The **audit log is the system of record**. Not memory, not chat, not spreadsheets.
- Internal docs live under `docs/`. The companion docs are listed in the file headers.

Rebuild from here.
