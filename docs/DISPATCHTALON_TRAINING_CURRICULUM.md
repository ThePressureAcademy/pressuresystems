INTERNAL ONLY — NOT FOR PUBLIC DISTRIBUTION

Product: DispatchTalon by Pressure Systems
Status: Internal operating doctrine
Use: For DispatchTalon workers, agents, implementation partners, sales operators, support operators, and founder-led commercialisation.
Public use: Not approved.
Pricing: Internal working model only.
Legal: Not legal advice. Not compliance advice. Not engineering advice.

Current route note: The public product route may still use `/liftiq/` for legacy stability, but the current product brand is DispatchTalon. LIFTIQ references should be treated as historical/legacy route context only.

---

# DispatchTalon — Training Curriculum

| Field | Value |
|---|---|
| Last reviewed | 2026-05-20 |
| Owner | Cody / Pressure Systems |
| Update trigger | Any PR changing worker system, job system, role coverage, SmartRank, CredentialGate, FatigueGuard, publish allocation, SMS provider handling, exports, or tenant/auth/security |
| Not public use | Curriculum is for internal users, design-partner staff under agreement, and authorised implementation partners only |
| Claim boundary reminder | Training must reinforce that DispatchTalon is decision-support and not a compliance, payroll, or engineering authority |

Each path defines: learning objective, modules, exercise, pass standard, and failure risk.

---

## 1. New Dispatcher

**Learning objective:** Run a full daily dispatch loop — open jobs, review SmartRank, resolve warnings, publish allocations, and close out — without breaching the claim boundary.

**Modules:**

1. The dispatch loop and the decision-layer stack.
2. Reading SmartRank rankings and warnings.
3. CredentialGate behaviour (expiring, expired, missing).
4. FatigueGuard behaviour and override reasons.
5. Role coverage and multi-role suggestions.
6. Publish allocation and SMS notification path.
7. Audit log expectations.

**Exercise:** Complete five seeded jobs in the training tenant covering: a clean allocation, a credential warning, a fatigue warning, a multi-role suggestion, and a forced override with reason.

**Pass standard:** All five jobs allocated with correct override reasons recorded; no claim-boundary breach in any operator note.

**Failure risk:** Dispatcher treats SmartRank as authority and stops reading warnings. Mitigation: re-train on decision-layer stack.

---

## 2. Operations Manager

**Learning objective:** Monitor weekly coverage health, review exceptions, and own the operator-side feedback loop into the product.

**Modules:**

1. Weekly coverage health dashboard (read-only).
2. Exception review (overrides, expired credentials, fatigue events).
3. Worker roster maintenance and credential refresh cadence.
4. Customer/site setup and impact on role coverage.
5. Feedback loop to DispatchTalon support and implementation.

**Exercise:** Produce a one-page weekly coverage review for the training tenant covering exceptions, near-misses, and at least one product feedback item.

**Pass standard:** Review surfaces real exceptions; product feedback is specific and actionable.

**Failure risk:** Weekly review becomes a vanity dashboard; real issues stay invisible. Mitigation: pair first three reviews with the implementation partner.

---

## 3. Company Owner

**Learning objective:** Use DispatchTalon as a strategic visibility layer without operating the daily loop personally.

**Modules:**

1. What DispatchTalon is and is not (claim boundaries).
2. The exports surface and what it does for payroll/finance.
3. The audit log and what it does for incident response.
4. Design-partner terms and feedback path.
5. Pricing — internal working model only; no external commitments.

**Exercise:** Read the audit log for a sample week and identify one decision the system surfaced that the owner would otherwise not have seen.

**Pass standard:** Owner can describe the product's value in plain language inside the claim boundary.

**Failure risk:** Owner repositions DispatchTalon externally as a compliance system. Mitigation: brief before any customer-facing comment.

---

## 4. Admin / Office User

**Learning objective:** Maintain the worker and credential records that the entire decision stack depends on, and run exports cleanly.

**Modules:**

1. Worker setup (identity, roles, contact).
2. Credential entry (type, number, issue, expiry, file/reference).
3. Site and customer setup.
4. Export to payroll and finance handoff.
5. Data hygiene and redaction expectations.

**Exercise:** Onboard five workers with full credential coverage; produce a payroll-shaped export for a sample week.

**Pass standard:** No missing required fields; expiries entered accurately; export matches the documented schema.

**Failure risk:** Bad credential data drives confidently-wrong SmartRank suggestions. Mitigation: monthly data-hygiene check.

---

## 5. DispatchTalon Support Worker

**Learning objective:** Triage and resolve customer-reported issues using the support playbook without crossing into sales, legal, or engineering territory.

**Modules:**

1. The support playbook structure: symptom → likely cause → first check → fix → escalation.
2. Hard rule: never say "fixed" until verified.
3. Escalation paths into product and implementation.
4. Credential and secret handling rules.
5. Customer communication scripts within the claim boundary.

**Exercise:** Handle three seeded support tickets covering a CredentialGate misunderstanding, an SMS delivery question, and an export schema question.

**Pass standard:** Each ticket logged with the playbook fields populated; no "fixed" claim without verification; no scope or pricing commitment.

**Failure risk:** Support drifts into sales or legal language. Mitigation: weekly call review against the claim boundary.

---

## 6. Sales Lead

**Learning objective:** Move a lead through the design-partner gates without overpromising scope, pricing, or compliance posture.

**Modules:**

1. The five design-partner gates (sourcing → first contact → discovery → scope agreement → pilot live).
2. The lead funnel system and weekly review cadence.
3. Scoring model and tier logic.
4. Approved outreach templates.
5. Claim boundaries in sales conversations.

**Exercise:** Source three candidate companies; score them; draft an outreach message for the strongest; mark gate state in the lead sheet.

**Pass standard:** No fabricated detail; gate state matches the criteria; message uses an approved template.

**Failure risk:** Pipeline inflation with leads that have not actually cleared gates. Mitigation: weekly review against gate definitions.

---

## 7. Implementation Partner

**Learning objective:** Deliver the 18-stage implementation playbook reliably across multiple tenants.

**Modules:**

1. Tenant setup and password rotation.
2. Build My Business setup.
3. Worker import and credential entry.
4. Job creation and role slot definition.
5. SmartRank and role coverage walkthroughs.
6. Publish allocation and SMS path.
7. Audit log and export handoff.
8. Support playbook and escalation.

**Exercise:** Run the full 18-stage playbook against a fresh training tenant; produce a completion record with verification notes for each stage.

**Pass standard:** Every stage verified; no stage marked complete on inspection alone; tenant ready for design-partner kick-off.

**Failure risk:** Stages skipped because they "look fine." Mitigation: hard rule — never mark complete without verification.

---

## 8. AI Agent

**Learning objective:** Operate inside the agent skill doctrine without fabrication, claim drift, or stop-condition breach.

**Modules:**

1. Universal agent rules.
2. No fabrication and no stale LIFTIQ assumptions.
3. Browser/live testing proof rules.
4. Credential and secret handling.
5. Role-specific scope (Product Audit, QA, Sales Qualification, Outreach, Implementation, Support, Documentation, Competitive Analysis, Demo/Recording, Commercialisation Sign-off).
6. Stop conditions, forbidden actions, escalation, and IF/THEN logic.

**Exercise:** Complete a representative task in each role with an audit trail showing stop conditions respected.

**Pass standard:** No fabrication; no boundary breach; every stop condition honoured.

**Failure risk:** Agent produces plausible but unverified output that gets shipped. Mitigation: human review on first production runs; sample audit thereafter.

---

## 9. Investor / Grant Reviewer

**Learning objective:** Understand DispatchTalon's positioning, traction, and roadmap inside the claim boundary, without operating live tenants.

**Modules:**

1. The market problem and decision-support framing.
2. Capability map and decision-layer architecture (high level).
3. Design-partner programme and current gate state.
4. Risk register (internal version is read-only for this audience).
5. Commercialisation sign-off status.

**Exercise:** Reviewer briefing session; questions captured and answered within the claim boundary.

**Pass standard:** Reviewer can describe the product accurately and within the boundary; no commitments made on Cody's behalf.

**Failure risk:** Investor pitch drifts into compliance/safety claims to inflate appeal. Mitigation: brief before every investor session; record the session.
