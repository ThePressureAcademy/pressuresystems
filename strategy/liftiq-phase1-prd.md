# LIFTIQ Phase 1 — Product Requirements Document
**Status:** Locked for Phase 1 build | May 2026  
**Scope:** Minimum operational engine required to run a live pilot  
**Not in scope:** Payroll, invoicing, quoting, maintenance, mobile native app, Xero/MYOB, FCC import

---

## Category Definition

**LIFTIQ is fatigue-aware decision intelligence for crane dispatch.**

Not crane ERP. Not FCC. Not a workforce management platform. Not a compliance suite.

Every feature decision in Phase 1 must answer this question:

> Does this strengthen fatigue awareness, credential blocking, crew-fit ranking, explainability, or allocation-level auditability?

If no: it is not Phase 1.

---

## Phase 1 Objective

Deliver a live, multi-company product that can run a real dispatch workflow for a 15–40 person crane operation — storing real operators, real credentials, real fatigue records, real jobs, and real allocation decisions — and produce outcome data that can be used as commercial proof.

**Gate condition for Phase 1 completion:**  
Two design-partner pilots running live. Documented baseline and post-LIFTIQ metrics captured. At least one case study with named blocks, fatigue interventions, or override events that changed a dispatch outcome.

---

## Core Modules

### 1. Company Setup
Create and manage a crane company account. Support multiple users per company with role-based access.

Required for: multi-tenancy, pilot isolation, future commercial separation.

### 2. Worker Profiles
Store the full operational record for each person who can be allocated to a job.

Required fields listed in data model (`docs/liftiq-data-model.md`).

### 3. CredentialGate
Track credentials by type, issue date, and expiry. Block allocation to jobs requiring credentials the worker does not hold or where the credential is expired.

**Phase 1 scope:**
- Manual credential entry
- Expiry tracking with 30/14/7 day alerts
- Hard block on expired or missing required credential
- Warning on credentials expiring within 30 days

**Not Phase 1:** Integration with licencing registries, automated credential verification, regulatory reporting exports.

### 4. FatigueGuard
Calculate and apply fatigue risk status for each worker based on hours worked, rest hours, consecutive days, and night shift load.

**Phase 1 rules:**
- Hard block: less than 10 hours rest since last shift
- Hard block: 48+ hours worked in current week
- Monitor/warning: 44+ hours worked in current week
- Warning: consecutive days threshold (configurable per company, default 5)
- Warning: night shift within 12 hours of day shift

**Not Phase 1:** Integration with payroll/timesheet systems, automated import of hours. Hours are entered manually by dispatcher or supervisor during pilot.

### 5. SmartRank
Rank all available, non-blocked workers against a job's requirements. Show score breakdown. Allow dispatcher to select any non-blocked worker, with non-top-ranked selections logged.

**Phase 1 scoring model:**

| Factor | Weight |
|--------|--------|
| Required credential match | 25% |
| Relevant crane/equipment experience | 20% |
| Fatigue risk state | 20% |
| Availability | 15% |
| Site or client familiarity | 10% |
| Fairness / recent load balance | 5% |
| Travel / proximity burden | 5% |

Score breakdown must be visible to the dispatcher for every ranked worker. If the reasoning is hidden, the tool is not useful.

**Not Phase 1:** Machine learning, predictive demand modelling, historical pattern inference.

### 6. Job Creation
Create a dispatch job with all fields required to run SmartRank and apply CredentialGate.

Required fields listed in data model.

**Not Phase 1:** Quoting, client CRM, invoice generation, job costing.

### 7. Allocation Decision
Dispatcher selects a worker from the SmartRank list. If a warning is active, a reason is required. Hard-blocked workers cannot be selected.

**Phase 1 hard rules:**
- Hard block = cannot be selected. No override path in Phase 1.
- Warning = can be selected, reason field is mandatory, reason saved to AuditIQ.
- Non-top-ranked selection = reason field prompted (optional in Phase 1, mandatory in Phase 2).

### 8. AuditIQ
Persist every meaningful decision event. This is not a log for its own sake — it is the commercial proof asset and the foundation of Phase 2 compliance claims.

**Required events:**
- Worker ranked (recommendation generated)
- Hard block applied (credential missing, expired, or fatigue)
- Warning triggered
- Dispatcher selected non-recommended worker (with reason)
- Warning acknowledged and overridden (with reason)
- Allocation confirmed
- Allocation changed after confirmation

**Required fields per event:** event type, user (dispatcher), affected worker, affected job, recommendation shown, decision made, all active warnings, override reason if applicable, timestamp.

**Phase 1 scope:** Persisted, queryable, displayable in pilot dashboard. Export is Phase 2.

### 9. Pilot Dashboard
Simple read-only view of outcomes for the pilot period. Designed for founder review and partner reporting, not production analytics.

**Required metrics:**
- Total allocations made
- Hard blocks triggered (with breakdown by type)
- Warnings triggered (with breakdown by type)
- Override events (warnings acknowledged and overridden)
- Average ranking position of final selection (1st = always top-ranked, higher = frequency of non-top selection)
- Credential issues caught (credential blocks triggered)
- Fatigue interventions (fatigue blocks or warnings that changed an allocation)

---

## Hard Non-Goals for Phase 1

The following are explicitly out of scope. They are not "future ideas" — they are deferred because building them now would dilute focus and delay the pilot gate.

| Out of Scope | Why |
|-------------|-----|
| Payroll | Does not affect dispatch decision quality |
| Invoicing | Does not affect dispatch decision quality |
| Quote builder | Useful only after dispatch intelligence is proven |
| Asset maintenance scheduling | Different problem, different buyer |
| Xero / MYOB integration | Requires payroll first; payroll is Phase 3 |
| Mobile native app | PWA in Phase 2; native is Phase 3 |
| FCC data import | Requires FCC customer access; pilot targets are spreadsheet users |
| Customer CRM | Sales tool, not dispatch intelligence |
| AI chat interface | No training data yet; no conversational use case defined |
| Full permissions matrix | Role-based access (dispatcher / supervisor / admin) is sufficient for Phase 1 |
| Multi-site analytics | Phase 3 |
| Automated credential verification | Phase 2 after manual proof |

---

## Pilot Workflow — What Phase 1 Must Support End-to-End

1. Dispatcher logs in
2. Dispatcher creates a job (client, site, crane type, required credentials, shift, risk level)
3. Dispatcher opens crew-fit view for that job
4. System applies CredentialGate: blocks workers with missing/expired required credentials
5. System applies FatigueGuard: blocks workers below rest threshold or over hour limit; warns on approaching limits
6. SmartRank ranks remaining available workers with score and breakdown
7. Dispatcher selects a worker (or reviews why options are limited)
8. If warning is active, dispatcher enters reason
9. Allocation is confirmed and saved
10. AuditIQ records the full event
11. Pilot dashboard reflects the event

If the system cannot do all ten steps with real data, it is still a demo.

---

## Definition of Done — Phase 1

| Criterion | Test |
|-----------|------|
| Multi-company isolation | Company A cannot see Company B's workers or jobs |
| Authentication | Users cannot access the system without login; roles enforce access |
| Worker profile completeness | A worker with no credentials can be created and blocked from all credentialed jobs |
| CredentialGate | An expired ticket produces a hard block; system prevents selection |
| FatigueGuard | A worker with 9 hours rest is blocked; 44-hour worker shows warning |
| SmartRank | Two comparable workers ranked differently based on score factors; breakdown visible |
| Allocation decision | Selection is saved; warning override requires reason; reason persisted |
| AuditIQ | Every block, warning, and selection event is queryable by job and by worker |
| Pilot dashboard | Pilot metrics are visible to founder and partner within 24 hours of any event |
| No data loss | Restarting the server does not lose any allocation record |

---

*This document is the Phase 1 scope lock. Changes to Phase 1 scope require explicit founder decision. Additions go to Phase 2 backlog.*
