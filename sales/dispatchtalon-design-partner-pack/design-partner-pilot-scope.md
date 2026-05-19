# Design Partner Pilot Scope

**Use:** Attached to the pilot invite message. Read aloud at kick-off. The single document both parties refer to when something is unclear.

**Status:** Internal working model. Pricing requires Cody's confirmation before any public or contractual use.

---

## What is included in every pilot type

Regardless of tier, every pilot includes:

1. **Tenant setup** — DispatchTalon tenant provisioned, admin credentials issued, password rotation enforced on first login
2. **Build My Business setup** — company profile, operating mode (plant / labour-only / mixed), tenant configuration
3. **Worker import** — CSV worker list ingested; role and credential records created
4. **Role / credential mapping** — alignment of customer's role names to DispatchTalon role taxonomy; credential register mapped
5. **Job intake** — job creation, requirement catalogue, role and credential requirements per job
6. **SmartRank** — 7-factor weighted crew ranking with per-factor explainability
7. **CredentialGate** — hard blocks on missing/expired credentials, pre-expiry warnings
8. **FatigueGuard** — hard blocks on rest-hour violations, graduated warnings on fatigue thresholds
9. **Multi-role allocation coverage** — a worker can cover multiple roles on a single job where credentials and capacity allow
10. **Publish allocation — manual SMS preview** — DispatchTalon generates the SMS text; dispatcher copies and sends from their own phone or system. DispatchTalon does not send the SMS.
11. **Audit trail (AuditIQ)** — every allocation decision, override, warning, and block is recorded in an append-only audit log
12. **CSV office handoff (Export Centre)** — structured CSV export of allocations, workers, and audit events for downstream office/accounting tools
13. **Feedback sessions** — cadence depends on tier (see "Per-tier specifics" below)

---

## What is excluded from every pilot

These are non-negotiable exclusions for Step 1.2. Do not promise any of these inside a standard pilot.

| Excluded item | Reason |
|---------------|--------|
| Direct SMS sending to workers | Phase 1 supports manual SMS preview only — dispatcher copies and sends |
| Direct Xero / MYOB integration | CSV handoff only — no API integration in Phase 1 |
| Payroll calculations | Out of Phase 1 scope |
| Invoice totals or billing | Out of Phase 1 scope |
| Permit approval | Defer to NHVR / state authorities |
| Lift engineering confirmation | Defer to engineer of record |
| Compliance, WHS, or legal advice | DispatchTalon is decision support, not a compliance authority |
| "Safe to dispatch" confirmation | The dispatcher confirms — DispatchTalon surfaces conditions only |
| Custom development | Not included in any tier unless separately scoped and quoted |
| Unlimited support | Hours are capped per tier (see below) |
| White-label or rebranding | Not available during pilot |
| Public reference use of the customer's name | Only with explicit written permission, and only after pilot week 12 |

---

## Per-tier specifics

All pricing below is **internal working model**. Confirm with Cody before any external use.

### 1. Testing Partner — $0 – $1,000 setup · 14–30 days

**Who it's for:** Operators who want to look under the hood before committing to a paid pilot. Limited scope, no operational reliance, no production allocation.

**Included scope:**
- All 13 baseline items above, capped at:
  - Up to 15 workers imported
  - Up to 2 users
  - Up to 20 jobs across the test window
  - No plant/asset register by default
- Email-only async support, capped at 2 hours total across the engagement
- One 45-minute mid-engagement check-in
- One 45-minute exit interview

**Excluded:**
- Any commercial reliance — Testing Partners must keep their existing dispatch process running in parallel
- Weekly review sessions
- Outcome report

**Feedback obligation:**
- Written feedback against `design-partner-feedback-framework.md` at end of test window
- Permission to use the engagement learnings anonymously

**End-of-term path:** Either upgrade to a paid pilot tier, or polite exit with data export.

---

### 2. Labour Allocation Pilot — $2,500 setup + $1,500 / month · 90 days · $7,000 total

**Who it's for:** Labour-only operators (no plant/assets), 20–50 workers, real weekly allocation pressure, want a structured place to make the decision.

**Included scope:**
- All 13 baseline items above, capped at:
  - Up to 50 workers imported
  - Up to 3 users
  - Up to 50 jobs across the 90 days
  - No plant/asset register by default (labour-only operating mode)
- Email + scheduled review support, capped at 4 hours per month
- Bi-weekly 30-minute review session (6 sessions across the pilot)
- One 60-minute mid-pilot review at week 6
- One 60-minute exit review at week 12

**Excluded:**
- Plant or asset allocation
- Custom roles or credentials beyond the standard catalogue
- Weekly review cadence (use Founding Partner if weekly is needed)
- Case-study production (possible but not promised)

**Feedback obligation:**
- Weekly tally of pilot success metrics from `design-partner-success-metrics.md`
- Bi-weekly written feedback against `design-partner-feedback-framework.md`
- Permission to use anonymised learnings

**End-of-term path:** Continuation on commercial terms TBC at week 10, or polite exit with data export.

---

### 3. Founding Partner Pilot — $5,000 setup + $2,500 / month · 90 days · $12,500 total

**Who it's for:** Labour + plant operators or serious labour-only operators who want close involvement in shaping DispatchTalon. The case-study and reference candidates.

**Included scope:**
- All 13 baseline items above, capped at:
  - Up to 100 workers imported
  - Up to 5 users
  - Up to 150 jobs across the 90 days
  - Up to 25 assets in the company asset register
  - Plant + labour operating modes both supported
- Workflow support — designated support channel, response window committed in agreement
- Support capped at 8 hours per month
- Weekly 30-minute review session
- Mid-pilot 90-minute working session at week 6
- Exit 90-minute review at week 12 with written outcome summary
- **Anonymised case study possible** — only with written consent at week 12

**Excluded:**
- Custom development (separately scoped if requested)
- Direct SMS automation (manual preview only)
- Xero/MYOB API (CSV only)
- Unlimited support — capped per above

**Feedback obligation:**
- Weekly success metrics submitted
- Weekly written feedback against `design-partner-feedback-framework.md`
- Permission for anonymised learnings in future DispatchTalon materials
- Right to opt out of any anonymised case study before publication

**End-of-term path:** Continuation on commercial terms negotiated at week 10. Founding Partners get first refusal on early commercial pricing.

---

### 4. Commercial Pilot — $10,000 setup + $5,000 / month · 90 days · $25,000 total

**Who it's for:** Operators running formal evaluation prior to a multi-year decision. Higher worker counts, higher job volumes, weekly review cadence, formal outcome report.

**Included scope:**
- All 13 baseline items above, capped at:
  - Up to 250 workers imported
  - Up to 10 users
  - Up to 500 jobs across the 90 days
  - Up to 75 assets in the company asset register
- Weekly 60-minute review with documented action register
- Mid-pilot half-day on-site or extended remote session at week 6
- Exit half-day session at week 12
- **Formal outcome report** delivered at week 13: scope met / not met, metrics achieved, recommended scaled deployment plan, gaps and next steps
- Support capped at 16 hours per month

**Excluded:**
- Custom development (separately scoped if requested)
- Direct SMS automation
- Xero/MYOB API
- Unlimited support — capped per above
- Procurement-led RFP responses are out of scope of a pilot; treat as a separate engagement

**Feedback obligation:**
- Daily-level metric capture for the formal outcome report
- Weekly written feedback against `design-partner-feedback-framework.md`
- Joint sign-off on the outcome report

**End-of-term path:** Move to commercial subscription on terms agreed at week 10, or formal exit with full data export.

---

### 5. Managed / On-call Support — $8,000–$10,000 / month add-on

**Status:** Add-on only. Not a standalone product.

**Who it's for:** A Founding Partner or Commercial Pilot who needs higher-touch implementation hours, on-call response, or operations advisory during the pilot.

**Included scope:**
- Additional support hours beyond the pilot's standard allocation
- Faster response window
- Cody (or designated operator) attendance at internal operations meetings as agreed
- Documented action register

**Excluded:**
- "Unlimited" support — hours and scope are documented in the add-on schedule
- Replacement of the customer's own operations function — Pressure Systems advises; the customer operates
- Coverage outside agreed hours and channels
- Custom development beyond what's separately scoped

**Cancellation:** 30-day notice from either side.

---

## Scope change handling

If the customer asks for something outside scope during the pilot:

1. Acknowledge — do not silently accept the request.
2. Record it against `design-partner-feedback-framework.md` "what they would pay for."
3. Quote it as a separate engagement if it's a real ask.
4. Decline if it crosses an excluded item above (e.g. payroll automation, permit approval).

Do not absorb scope creep to keep a partner happy. It corrupts the pilot signal.

---

*Pricing in this document is an internal working model and is not yet committed externally. Confirm with Cody before sending any tier's pricing to a prospect. Final commercial terms always go through the agreement outline and a lawyer review.*
