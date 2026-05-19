# DispatchTalon Commercialisation Sign-off Checklist

**Status:** Internal operating reference | May 2026
**Owner:** Cody / Pressure Systems
**Classification:** Internal — not for public distribution
**Companion to:** `DISPATCHTALON_MASTER_OPERATING_DOCTRINE.md`

This checklist must be completed before any of these events:
- Public launch or outbound campaign at scale
- Investor presentation or pitch deck distribution
- Grant application referencing the product
- First design partner agreement signed
- Any public marketing that names DispatchTalon's capabilities

Work through each section. Every item must return READY, NOT READY, or BLOCKED.

**A single BLOCKED item in any section stops the launch for that section. Resolve or document the resolution path before proceeding.**

---

## Section 1 — Product Readiness

*Can the product do what we say it does, on demand, reliably, in a clean tenant?*

### 1.1 Core login and access

| Item | Status | Evidence / Notes |
|------|--------|------------------|
| Login works for a new admin user with forced password rotation | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Password reset works and does not expose credentials | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Tenant isolation confirmed — no cross-tenant data visible | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Clean tenant setup creates an empty, correctly configured tenant | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |

---

### 1.2 Core allocation workflow

| Item | Status | Evidence / Notes |
|------|--------|------------------|
| Worker import from CSV works with name, role, credential, expiry | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Worker profile multi-role assignment works | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Credential record with expiry date works and CredentialGate references it | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Job creation with role counts works | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| SmartRank runs and produces a ranked list | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| CredentialGate surfaces pass / warning / block correctly | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| FatigueGuard surfaces consecutive shift flags correctly | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Schedule conflict detection flags overlapping allocations | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Multi-role coverage shows conservative vs suggested headcount | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Override with reason works and is recorded in AuditIQ | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Publish allocation works and generates SMS preview text | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| AuditIQ records all expected events in append-only log | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |

---

### 1.3 Export Centre

| Item | Status | Evidence / Notes |
|------|--------|------------------|
| Workers CSV exports correctly | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Jobs CSV exports correctly | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Allocations CSV exports correctly | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Payroll-prep CSV exports correctly | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Audit CSV exports correctly | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Metrics CSV exports correctly | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |

---

### 1.4 Infrastructure

| Item | Status | Evidence / Notes |
|------|--------|------------------|
| Fly.io tenant provisioning process documented and tested | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| PR #13 (volume permissions hotfix) merged | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| PR #12 (CI/CD pipeline) configured with FLY_API_TOKEN | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Seed script works after deployment | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| No default credentials persisting in any tenant | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |

**Product Readiness verdict:** ☐ READY TO PROCEED / ☐ NOT READY — complete the NOT READY items / ☐ BLOCKED — resolve before any external engagement

---

## Section 2 — Market Readiness

*Does the outbound material accurately represent the product as it exists today?*

### 2.1 Public-facing materials

| Item | Status | Evidence / Notes |
|------|--------|------------------|
| Homepage is current (DispatchTalon brand, no LIFTIQ references) | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Homepage does not contain public pricing | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Homepage does not make compliance, safety, or regulatory approval claims | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Banned vocabulary absent from all public pages | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Formspree inbound form is live and routing correctly | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |

---

### 2.2 Design partner pack

| Item | Status | Evidence / Notes |
|------|--------|------------------|
| `README.md` — complete and current | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| `design-partner-qualification-scorecard.md` — complete | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| `design-partner-outreach-messages.md` — complete | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| `design-partner-discovery-call-script.md` — complete | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| `design-partner-pilot-scope.md` — complete | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| `design-partner-feedback-framework.md` — complete | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| `design-partner-agreement-outline.md` — "NOT LEGAL ADVICE" header present | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| `design-partner-success-metrics.md` — complete | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| `design-partner-follow-up-templates.md` — complete | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| `internal-lead-scoring-sheet.md` — complete | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| `docs/dispatchtalon-design-partner-gate-criteria.md` — complete | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| `first-5-lead-qualification-sheet.md` — ready to populate | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |

---

### 2.3 Sales readiness

| Item | Status | Evidence / Notes |
|------|--------|------------------|
| Discovery call script reviewed and memorised (or printed) | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| All 12 objections in the objection-handling guide reviewed | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Tier recommendation logic understood and confirmed with Cody | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Pricing confirmed by Cody as the current internal working model | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Banned vocabulary list understood by everyone who will represent the product | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |

---

### 2.4 Demo readiness

| Item | Status | Evidence / Notes |
|------|--------|------------------|
| Demo tenant contains only TEST-labelled data | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Demo tenant reflects current brand (DispatchTalon) | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| At least one demo walkthrough video recorded (safe for external sharing) | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Demo video reviewed: no passwords, no real data, no terminal visible | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Demo video reviewed: no old LIFTIQ branding visible | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |

**Market Readiness verdict:** ☐ READY TO PROCEED / ☐ NOT READY — complete the NOT READY items / ☐ BLOCKED — resolve before any external engagement

---

## Section 3 — Legal and IP Readiness

*Are we protected? Are we making claims we cannot defend?*

| Item | Status | Evidence / Notes |
|------|--------|------------------|
| DispatchTalon name risk reviewed with an attorney (or attorney consultation booked) | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Trademark search in relevant classes completed or in progress | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| No public trademark claim ("®" or "™") made before attorney review | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Pilot agreement outline lawyer-reviewed before first partner signing | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| IP ownership register started (software, brand, design, models, documentation) | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Pressure Systems Pty Ltd (or trading entity) confirmed as the contracting entity | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Governing law jurisdiction confirmed with lawyer | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Professional indemnity cover confirmed before first Commercial Pilot agreement | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Privacy Act obligations reviewed for the worker data held in tenant | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| No external claim of compliance, safety approval, or regulatory authorisation | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |

**Legal / IP Readiness verdict:** ☐ READY TO PROCEED / ☐ NOT READY — complete the NOT READY items / ☐ BLOCKED — do not proceed with external launch until resolved

---

## Section 4 — Operational Readiness

*Can we actually run a pilot?*

| Item | Status | Evidence / Notes |
|------|--------|------------------|
| Tenant provisioning process end-to-end (from signed agreement to first login) tested | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Worker import process tested with a real CSV | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Password reset process tested | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Data export process tested for all 6 export types | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Support boundaries documented and ready to share with first partner | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Weekly review process confirmed (calendar template, feedback framework) | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Kick-off session structure confirmed (90 minutes, agenda defined) | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Baseline metric capture process confirmed | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Exit review process confirmed | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Data cleanup and deactivation process tested | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |

**Operational Readiness verdict:** ☐ READY TO PROCEED / ☐ NOT READY — complete the NOT READY items / ☐ BLOCKED — resolve before provisioning first partner tenant

---

## Section 5 — Commercial Readiness

*Are we actually talking to the right people, and are we ready to convert a conversation to a pilot?*

| Item | Status | Evidence / Notes |
|------|--------|------------------|
| First five leads scored and recorded in `first-5-lead-qualification-sheet.md` | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Top two leads contacted using approved outreach templates | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| First discovery call booked | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| One pilot scope drafted and reviewed by Cody | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Agreement outline lawyer-reviewed (at least one pass before first signing) | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| Pricing confirmed as current internal working model by Cody | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |
| At least one lead at or past `scope-sent` stage | ☐ READY / ☐ NOT READY / ☐ BLOCKED | |

**Commercial Readiness verdict:** ☐ READY TO PROCEED / ☐ NOT READY — complete the NOT READY items / ☐ BLOCKED — resolve before any commercial commitment

---

## Overall Sign-off Summary

| Section | Verdict |
|---------|---------|
| 1. Product Readiness | ☐ READY / ☐ NOT READY / ☐ BLOCKED |
| 2. Market Readiness | ☐ READY / ☐ NOT READY / ☐ BLOCKED |
| 3. Legal / IP Readiness | ☐ READY / ☐ NOT READY / ☐ BLOCKED |
| 4. Operational Readiness | ☐ READY / ☐ NOT READY / ☐ BLOCKED |
| 5. Commercial Readiness | ☐ READY / ☐ NOT READY / ☐ BLOCKED |

**Overall verdict:**

☐ **READY TO LAUNCH** — All five sections READY. Proceed with external engagement.

☐ **NOT READY** — One or more sections have NOT READY items. Complete those items; re-check.

☐ **BLOCKED** — One or more BLOCKED items exist. Do not proceed with external engagement until each BLOCKED item has a documented resolution path and Cody's sign-off.

---

## Sign-off Record

| Field | Value |
|-------|-------|
| Date of sign-off | |
| Signed off by | Cody / Pressure Systems |
| Overall verdict | |
| Outstanding items (if any) | |
| Resolution plan for BLOCKED items | |
| Next review date | |

---

## Known items not in scope for this checklist

These are real needs that this checklist does not cover. They are tracked separately:

- Source escrow (recommended: no escrow at pilot stage; revisit at first Commercial Pilot renewal)
- Insurance requirements beyond standard PI cover (review with lawyer if any single pilot fee exceeds $25,000)
- Cross-border data handling if a partner operates outside Australia
- Regulatory notifications if a design partner operates in a jurisdiction with specific WHS reporting requirements for software used in dispatch
- Dispute resolution mechanism in the pilot agreement (mediation step before litigation — confirm with lawyer)

---

*This checklist is not a guarantee of product fitness or commercial success. It is a structured due-diligence checkpoint that reduces the chance of making promises that the product cannot keep, claims that lawyers would contest, and commitments that operational capacity cannot deliver.*
