INTERNAL ONLY — NOT FOR PUBLIC DISTRIBUTION

Product: DispatchTalon by Pressure Systems
Status: Internal operating doctrine
Use: For DispatchTalon workers, agents, implementation partners, sales operators, support operators, and founder-led commercialisation.
Public use: Not approved.
Pricing: Internal working model only.
Legal: Not legal advice. Not compliance advice. Not engineering advice.

Current route note: The public product route may still use `/liftiq/` for legacy stability, but the current product brand is DispatchTalon. LIFTIQ references should be treated as historical/legacy route context only.

---

# DispatchTalon — Implementation Playbook

| Field | Value |
|---|---|
| Last reviewed | 2026-05-20 |
| Owner | Cody / Pressure Systems |
| Update trigger | Any PR changing tenant/auth/security, Build My Business setup, worker system, job system, role coverage, SmartRank, publish allocation, SMS provider handling, or exports |
| Not public use | Implementation steps are for authorised implementation partners and DispatchTalon support workers only |
| Claim boundary reminder | Implementation must not assert compliance, safety, payroll, or engineering authority |

**Hard rule (applies to every stage and every support case): Never say "fixed" or "complete" until verified by observed behaviour. Inspection is not verification.**

---

## 1. 18-Stage Implementation Process

Each stage has: **Goal**, **Action**, **Verification**, **Exit condition**.

### Stage 1 — Pre-kick-off intake

- **Goal:** Confirm pilot scope, sponsor, and worker count band.
- **Action:** Review signed design-partner terms; confirm sponsor and operational contact.
- **Verification:** Sponsor named in writing; worker count band recorded.
- **Exit condition:** Intake record exists and matches the signed terms.

### Stage 2 — Tenant setup

- **Goal:** Provision a clean tenant for the design partner.
- **Action:** Create tenant using internal tenant provisioning procedure; assign owner.
- **Verification:** Tenant is isolated, owner login confirmed by the owner.
- **Exit condition:** Tenant accessible to the owner; no shared credentials with other tenants.

### Stage 3 — Password rotation

- **Goal:** Ensure no provisioning credential remains in circulation.
- **Action:** Owner sets their own password using the documented rotation flow; implementation partner's provisioning credential is invalidated.
- **Verification:** Provisioning credential no longer authenticates; owner credential authenticates.
- **Exit condition:** Rotation logged; old credential confirmed dead.

### Stage 4 — Build My Business setup

- **Goal:** Populate the tenant scaffolding (roles, credential types, sites, customers).
- **Action:** Walk the owner through Build My Business; record sector-specific role list and credential types.
- **Verification:** Role list and credential types match the operator's working vocabulary; sample site and customer entered.
- **Exit condition:** Scaffolding is complete and named in the operator's own language.

### Stage 5 — Worker import

- **Goal:** Load worker records with role assignments and contact details.
- **Action:** Import workers via the documented import flow; verify role assignments per worker.
- **Verification:** Spot-check at least 5 workers against the source roster; confirm contact channel.
- **Exit condition:** Worker count matches source; spot-checks pass.

### Stage 6 — Credential entry

- **Goal:** Record each worker's required credentials with issue and expiry.
- **Action:** Admin enters credentials; flags any unknown expiries for follow-up.
- **Verification:** CredentialGate behaviour observed for one expired, one expiring, one current credential.
- **Exit condition:** No required-credential field left blank for any active worker; expiries entered.

### Stage 7 — Job creation

- **Goal:** Create a representative set of jobs with role slots, timing, site, and customer.
- **Action:** Create three seeded jobs covering single-role, multi-role, and tight-timing scenarios.
- **Verification:** Job records show correct role slots and timing windows.
- **Exit condition:** Three seeded jobs exist; data shape matches the production loop.

### Stage 8 — SmartRank walkthrough

- **Goal:** Operator can read and trust SmartRank output without treating it as authority.
- **Action:** Walk the operator through SmartRank against each seeded job; explain ranking factors and warning surface.
- **Verification:** Operator can articulate why a top-ranked candidate ranked first and what would change the ranking.
- **Exit condition:** Operator demonstrates correct interpretation on at least one job without prompting.

### Stage 9 — CredentialGate walkthrough

- **Goal:** Operator understands credential blocking and warning behaviour.
- **Action:** Demonstrate expired, expiring, and missing credential cases.
- **Verification:** Operator can correctly classify each case and the resulting system behaviour.
- **Exit condition:** Walkthrough recorded; operator passes a quick check.

### Stage 10 — FatigueGuard walkthrough

- **Goal:** Operator understands fatigue surfacing and override expectations.
- **Action:** Demonstrate a back-to-back shift conflict; show override flow with reason capture.
- **Verification:** Override reason captured into the audit log.
- **Exit condition:** Override flow exercised once with a real reason.

### Stage 11 — Role coverage walkthrough

- **Goal:** Operator understands multi-role coverage suggestions and the review warnings.
- **Action:** Use a multi-role seeded job; walk through suggestion, warning, confirmation.
- **Verification:** Operator confirms allocation with active warning and records reason.
- **Exit condition:** Multi-role allocation published in the training tenant.

### Stage 12 — Publish allocation

- **Goal:** Operator can publish a planned allocation and see notification path execute.
- **Action:** Publish one allocation in the staging or training tenant.
- **Verification:** SMS notification path observed (or test-mode confirmation), not just inferred.
- **Exit condition:** Notification delivery confirmed for at least one allocation.

### Stage 13 — Role coverage rehearsal (live data shadow)

- **Goal:** Run the next planned dispatch loop in DispatchTalon alongside the operator's existing system.
- **Action:** Operator allocates the next real day's jobs in DispatchTalon as a shadow run.
- **Verification:** Allocations match the operator's live decision within an agreed margin; differences explained.
- **Exit condition:** One full day shadowed with explanations for each divergence.

### Stage 14 — Audit log review

- **Goal:** Owner and operator can read the audit log and use it for review.
- **Action:** Review the audit log entries from stages 12 and 13 with owner.
- **Verification:** Owner can locate at least one override reason and one publish event.
- **Exit condition:** Audit review session recorded.

### Stage 15 — Exports

- **Goal:** Admin can export weekly data for payroll/finance handoff.
- **Action:** Run the documented export for a sample week.
- **Verification:** Export matches the documented schema; admin can describe the handoff to their payroll/finance step.
- **Exit condition:** One clean export delivered to admin and acknowledged.

### Stage 16 — Support playbook handoff

- **Goal:** Customer knows how to raise a support case and what to expect.
- **Action:** Walk through the support playbook in section 3; identify the customer's primary support contact.
- **Verification:** Customer can name the support channel and expected first response.
- **Exit condition:** Support contact and channel recorded.

### Stage 17 — Go-live cutover

- **Goal:** Move from shadow to live operational use.
- **Action:** Agree a cutover date; confirm rollback plan; switch the operator's primary dispatch surface to DispatchTalon.
- **Verification:** Go-live day completed with allocations published in DispatchTalon and no rollback triggered.
- **Exit condition:** First live day complete; debrief held.

### Stage 18 — 30-day review

- **Goal:** Confirm operational stability and capture product feedback.
- **Action:** Hold a 30-day review with owner, operations manager, and dispatcher.
- **Verification:** Feedback captured into the product log; outstanding blockers tracked.
- **Exit condition:** Review recorded; design-partner programme continues toward week-12 success-metrics review.

---

## 2. Recurring Operational Tasks

These tasks recur inside the implementation and into normal operations.

### Tenant Setup

- Always provision into a clean tenant.
- Never share tenants between design partners.
- Never reuse a provisioning credential after handover.

### Password Rotation

- Rotation occurs at the end of Stage 3 and at any indication of credential compromise.
- The owner is responsible for rotating their own credential; the implementation partner never holds the live owner credential.
- Rotations are logged with date and actor (no credential values).

### Build My Business Setup

- Roles and credential types are entered in the operator's own language.
- Sites and customers reflect the operator's actual book, not a generic template.
- Build My Business is revisited whenever the operator's book changes materially.

### Worker Import

- Imports are spot-checked against the source roster.
- A worker without at least one role and one valid contact channel is incomplete.
- Bulk edits are logged.

### Job Creation

- Role slots reflect the operator's allocation reality, not the system's preference.
- Timing windows are entered in the operator's local timezone.
- A job without a site or customer is incomplete.

### SmartRank

- SmartRank is a ranking aid; the operator chooses.
- Warnings on the top-ranked candidate must be read before publishing.
- SmartRank does not certify a worker; it surfaces fit against recorded data.

### Role Coverage

- Multi-role coverage is a suggestion; the operator confirms.
- Suggestions with timing, supervision, or independence implications carry review warnings.
- Confirmations with active warnings require a reason.

### Publish Allocation

- Only the operator publishes.
- Publishing triggers the SMS notification path.
- A failed notification surfaces in the dispatcher view; it is not silent.

### Audit

- Every publish event, override, and reason is recorded in the audit log.
- The audit log is append-only.
- The audit log is the source of truth for "what was decided and why."

### Exports

- Exports are read-only and schema-versioned.
- Exports never contain credentials or secrets.
- Schema changes are versioned and announced internally before release.

---

## 3. Support Playbook

Use the structure: **Symptom → Likely cause → First check → Fix → Escalation**. Never mark a ticket "fixed" without verification.

### 3.1 SmartRank suggestion looks wrong

| Field | Value |
|---|---|
| Symptom | Operator says SmartRank surfaced an unexpected candidate |
| Likely cause | Stale role assignment, missing credential entry, fatigue state misrecorded, or override history skewing |
| First check | Confirm worker's recorded roles and credentials match reality; check fatigue state for the window |
| Fix | Correct underlying record; re-run SmartRank on the job |
| Escalation | If records are correct and SmartRank still surfaces incorrectly, escalate to product audit with the job ID and time |

### 3.2 CredentialGate blocking a known-valid worker

| Field | Value |
|---|---|
| Symptom | Operator says CredentialGate is blocking a worker who is in fact credentialed |
| Likely cause | Credential expiry not entered, wrong credential type recorded, or credential not linked to the role |
| First check | Open the worker record; confirm credential type, number, issue, expiry, and role linkage |
| Fix | Correct the credential record; re-run the allocation |
| Escalation | If record is correct and gate still blocks, escalate to product audit |

### 3.3 SMS notification not received

| Field | Value |
|---|---|
| Symptom | Worker reports they did not receive an allocation SMS |
| Likely cause | Wrong number on file, provider delay, worker handset, or provider outage |
| First check | Verify the worker's recorded number; check the notification log for send status |
| Fix | Correct the number if wrong; resend; if provider issue, follow the documented provider fallback |
| Escalation | If provider-level outage, escalate per the SMS provider handling doc |

### 3.4 Export schema does not match payroll/finance expectations

| Field | Value |
|---|---|
| Symptom | Admin reports payroll/finance import failed |
| Likely cause | Schema version mismatch, missing field, or admin's destination changed |
| First check | Compare export header to documented schema version |
| Fix | Re-run export at the correct schema version; if destination changed, capture the new requirements |
| Escalation | If a true schema bug, escalate to the export architecture owner |

### 3.5 Role coverage suggestion missing for a known-eligible worker

| Field | Value |
|---|---|
| Symptom | Operator expected a multi-role suggestion that did not appear |
| Likely cause | One of the roles or required credentials is not recorded; timing window conflict |
| First check | Confirm both roles and all required credentials are recorded and current; verify timing |
| Fix | Correct missing record or adjust timing; re-run role coverage |
| Escalation | If records are correct and timing is feasible, escalate to product audit |

### 3.6 Audit log entry missing for a known allocation

| Field | Value |
|---|---|
| Symptom | Operator cannot find an allocation decision in the audit log |
| Likely cause | Allocation never published; user is looking in the wrong tenant; filter applied |
| First check | Confirm publish event exists; confirm tenant; clear filters |
| Fix | If not published, the loop did not complete — re-run with the operator |
| Escalation | If a published event is genuinely missing from the audit log, escalate immediately — this is a system-of-record breach |

### 3.7 Tenant login failure after rotation

| Field | Value |
|---|---|
| Symptom | Owner cannot log in after Stage 3 rotation |
| Likely cause | Rotation incomplete; cached credential in client |
| First check | Walk owner through credential reset using documented flow; clear cached login |
| Fix | Complete the rotation flow |
| Escalation | If credential cannot be reset, escalate to the tenant/auth/security owner |

---

## 4. Hard Rule (Restated)

**Never say "fixed" until verified.** A change merged is not a fix. A change deployed is not a fix. A change observed working in the relevant environment is a fix.

If verification is not possible at the time of report, mark the case **"change applied — verification pending"** and capture what would constitute verification. Do not let "applied" drift into "fixed" in any written or spoken update.
