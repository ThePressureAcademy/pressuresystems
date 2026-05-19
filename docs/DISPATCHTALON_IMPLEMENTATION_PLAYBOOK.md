# DispatchTalon Implementation Playbook

**Status:** Internal operating reference | May 2026
**Owner:** Pressure Systems
**Classification:** Internal — not for public distribution
**Companion to:** `DISPATCHTALON_MASTER_OPERATING_DOCTRINE.md`

---

## How to use this document

This playbook covers everything from signed agreement to active pilot. It has two parts:

- **Part 1:** The 18-stage implementation sequence (Gate 4 plus first week of pilot)
- **Part 2:** The support playbook for all 13 issue categories

Use Part 1 as a sequential checklist at kick-off. Use Part 2 as a reference when something breaks or is confusing.

**Cardinal rule: Do not advance past a stage until the stage condition is verified. Do not skip stages.**

---

## Part 1 — Implementation Stages

### Stage 1: Lead qualified

**Owner:** Cody
**Required inputs:** Lead score ≥14 in `first-5-lead-qualification-sheet.md` or `internal-lead-scoring-sheet.md`
**Output:** Score recorded with fit category, risk flags, and next action set

**Success check:** Score on file, date recorded, next action has a due date
**Common failure:** Score not captured within 30 minutes of call → score degrades as memory fades
**IF score not captured within 30 min THEN:** Use notes from call to reconstruct score; mark as `[estimated — not real-time]`

---

### Stage 2: Discovery call completed

**Owner:** Cody
**Required inputs:** 30-minute call with decision-maker present; discovery call script followed
**Output:** Updated score, verbatim quotes captured, risk flags updated, stage = `discovery-done`

**Success check:** All 12 script sections covered (or scored zero on skipped); post-call follow-up sent within 4 hours
**Common failure:** Decision-maker not on the call → send template B5; schedule second call with owner before advancing
**IF decision-maker not on call THEN:** Do not advance to Stage 3. Send B5. Wait for the decision-maker call.

---

### Stage 3: Pilot tier selected

**Owner:** Cody
**Required inputs:** Post-call score; fit category
**Output:** Tier proposed to partner (verbally first)

| Score | Tier |
|-------|------|
| 40–50 | Founding Partner or Commercial Pilot |
| 30–39 | Labour Allocation Pilot |
| 20–29 | Testing Partner |
| <20 | Polite decline (template B4) |

**Success check:** Tier confirmed by Cody; not self-proposed by the partner
**Common failure:** Partner self-proposes a higher tier than their score warrants
**IF partner wants a higher tier than scorecard supports THEN:** Explain the tier logic honestly; propose the correct tier; do not upsell into a bad-fit pilot

---

### Stage 4: Agreement sent

**Owner:** Cody + Cody's lawyer
**Required inputs:** Pilot scope (correct tier); agreement outline; success metrics; pricing confirmed by Cody
**Output:** Three documents sent to partner using template C1

**Success check:** Partner has received and acknowledged all three documents
**Common failure:** Agreement sent before scope is agreed in principle
**IF scope not yet verbally agreed THEN:** Send scope first; do not send the agreement outline until scope is agreed. Template C1 goes out together.

---

### Stage 5: Agreement signed

**Owner:** Both parties' lawyers (Founding and Commercial); Pressure Systems' lawyer (Labour tier and above)
**Required inputs:** Lawyer-reviewed final agreement; both parties' signatures
**Output:** Signed agreement on file in `{{secure_drive}}`

**Success check:** Signed copy stored; date recorded in lead sheet; stage = `signed`
**Common failure:** Partner signs before their lawyer has reviewed
**IF partner wants to skip lawyer review THEN:** For Testing Partner — acceptable with written acknowledgement. For Labour tier and above — do not proceed without both parties' lawyers reviewing.

**CRITICAL: Do not provision a live tenant until this stage is complete.**

---

### Stage 6: Tenant created

**Owner:** Cody (infrastructure)
**Required inputs:** Partner legal entity name; pilot tier (for caps); operating mode decision
**Output:** Live tenant on Fly.io, isolated from all other tenants, tested for first login

**Success check:** Cody can log in as admin; tenant is confirmed empty (no residual demo data); correct operating mode set
**Common failure:** Old demo data left in the tenant from a previous test
**IF old data is present THEN:** Run clean-tenant procedure; verify empty before issuing credentials to partner

---

### Stage 7: Admin user provisioned

**Owner:** Cody
**Required inputs:** Partner admin name and email
**Output:** Admin user created with pre-set password; pre-set password issued via secure channel (not email in plain text if avoidable)

**Success check:** Admin user exists with correct role; pre-set password issued and not recorded anywhere persistent
**Common failure:** Cody records the pre-set password in a document or chat message
**IF pre-set password is in a document THEN:** Delete it immediately; the password should only exist in the partner's hands and in the forced-rotation flow

---

### Stage 8: Password rotation completed

**Owner:** Partner admin
**Required inputs:** Admin login with pre-set password
**Output:** Partner admin has created their own password; pre-set password is invalidated

**Success check:** Partner admin confirms successful login with new password
**Common failure:** Partner admin does not rotate on first login; pre-set password persists
**IF partner admin has not rotated by 24 hours before kick-off THEN:** Call them; walk through the rotation step; do not proceed to kick-off with the pre-set password in use

---

### Stage 9: Build My Business setup

**Owner:** Cody + partner admin/ops manager
**Required inputs:** Operating mode decision; company name; worker cap; job cap; asset cap (if plant+labour); notification preference
**Output:** Tenant configured with correct operating mode and caps for the pilot tier

**Success check:** Operating mode matches the pilot tier; caps do not exceed the tier's limits
**Common failure:** Caps set too low because the partner wants to "start small" — this blocks real allocation testing
**IF partner wants caps lower than the tier minimum THEN:** Explain the impact; recommend minimum caps that allow meaningful testing of the allocation workflow

---

### Stage 10: Worker import

**Owner:** Cody + partner admin
**Required inputs:** Worker list in any CSV format (name, roles, credentials, expiry dates)
**Output:** All workers imported; roles assigned; credentials recorded; expiry dates entered

**Success check:** ≥80% of the partner's active worker list is in the system with at least one role and one credential each
**Common failure:** Worker list arrives with missing credentials or missing roles — CredentialGate produces false blocks for every worker
**IF worker list has missing credentials THEN:** Import what exists; flag the gaps to the partner; agree a date for credential data to be completed before the first allocation run
**IF worker list has not arrived by 48 hours before kick-off THEN:** Defer kick-off; communicate proactively to partner

---

### Stage 11: Requirement catalogue setup

**Owner:** Cody + ops manager
**Required inputs:** Company's role list and which credentials each role requires
**Output:** Requirement catalogue populated with all roles the company uses and their credential requirements

**Success check:** CredentialGate produces expected results on a test worker (known to have the credential → pass; known to lack it → block)
**Common failure:** Catalogue built from memory rather than the company's actual credential requirements — produces incorrect CredentialGate outcomes
**IF catalogue produces unexpected CredentialGate results THEN:** Review the catalogue against the company's actual credential policy; correct and re-test before the first live allocation run

---

### Stage 12: Assets added (plant+labour only)

**Owner:** Cody + partner admin
**Required inputs:** Asset register (asset number, type, category, status)
**Output:** Asset register populated and available for job assignment

**Success check:** At least one asset visible in the asset register and selectable in a test job
**Common failure:** Labour-only partner has plant that is referenced informally but not tracked — create the asset register anyway if the partner wants plant context in allocations
**IF asset register is empty and partner is in plant+labour mode THEN:** Defer plant allocation features; operate in labour-only mode until assets are entered

---

### Stage 13: First job created

**Owner:** Dispatcher (partner)
**Required inputs:** A real upcoming job with site, date, start time, role requirements
**Output:** Structured job record in DispatchTalon

**Success check:** Job has at least one role with a count; date and time are set; Cody can view it in the tenant
**Common failure:** Dispatcher creates the job but enters requirements loosely (e.g., "crane crew" instead of "Rigger × 2, Dogman × 1")
**IF job requirements are insufficiently structured THEN:** Walk the dispatcher through the role count entry; this is the input that drives SmartRank quality

---

### Stage 14: First SmartRank run

**Owner:** Dispatcher (with Cody on the call at kick-off)
**Required inputs:** Structured job with role counts; populated worker register
**Output:** Ranked candidate list with CredentialGate and FatigueGuard results visible

**Success check:** SmartRank returns results; CredentialGate results make sense relative to the worker data; no obvious errors
**Common failure:** SmartRank returns no results because no worker matches the requirement catalogue
**IF SmartRank returns no eligible workers THEN:** Check the requirement catalogue against the worker profiles; a mismatch in credential naming is the most common cause

---

### Stage 15: First allocation published

**Owner:** Dispatcher
**Required inputs:** Confirmed SmartRank result; all role slots filled; all warnings acknowledged
**Output:** Published allocation in AuditIQ; SMS preview text available for dispatcher to send manually

**Success check:** Allocation appears in AuditIQ with a published event; SMS preview is visible and accurate
**Common failure:** Dispatcher does not understand that the SMS preview requires manual copy-and-send
**IF dispatcher expects SMS to send automatically THEN:** Demonstrate the manual copy-and-send step explicitly; this is a deliberate product decision, not a bug

---

### Stage 16: Audit checked

**Owner:** Cody + partner
**Required inputs:** At least one completed allocation
**Output:** AuditIQ reviewed and understood by the partner ops manager

**Success check:** Partner ops manager can identify the allocation event, the CredentialGate outcome, and any override reasons in the AuditIQ log
**Common failure:** Partner does not review the audit; later asks "how do I know what was checked?" — the answer is in the audit they have not looked at
**IF partner has not reviewed audit by end of week 1 THEN:** Walk through it together in the week 1 health check call; do not leave this unreviewed

---

### Stage 17: Export checked

**Owner:** Partner admin
**Required inputs:** At least one completed allocation
**Output:** At least one CSV export downloaded and reviewed by the partner admin

**Success check:** Admin confirms the CSV contains the expected data and is in a format they can work with
**Common failure:** Admin does not know the Export Centre exists; allocation data piles up without being reviewed
**IF admin has not exported by end of week 1 THEN:** Guide them through the Export Centre in the week 1 health check; this is the step that reduces admin retyping — it must be part of the workflow from day one

---

### Stage 18: Weekly feedback started

**Owner:** Cody
**Required inputs:** First weekly review scheduled; partner attending
**Output:** First feedback session completed; feedback recorded in `design-partner-feedback-framework.md`

**Success check:** First weekly review held; at least one piece of usable feedback captured; next review scheduled
**Common failure:** Review is scheduled but not held; no feedback captured; metrics stagnate
**IF first review is missed THEN:** Reschedule within 48 hours; do not move to the next week without capturing week 1 feedback

---

## Part 2 — Support Playbook

**Cardinal rule: Never say "fixed" until verified. Never apply a fix without confirming the symptom first.**

---

### Support Category 1: Login / password

| | Detail |
|---|--------|
| **Symptom** | Partner cannot log in |
| **Likely cause** | Pre-set password not rotated; browser cached old credentials; account not created |
| **First check** | Confirm the user account exists in the tenant admin panel |
| **Fix** | Trigger password reset; confirm partner receives the reset link; confirm login |
| **Escalation** | If reset does not work within two attempts → investigate account state; do not issue a new password in chat |

---

### Support Category 2: Tenant setup

| | Detail |
|---|--------|
| **Symptom** | Features behave unexpectedly or are missing |
| **Likely cause** | Build My Business incomplete; wrong operating mode set |
| **First check** | Review Build My Business configuration; confirm operating mode |
| **Fix** | Complete the Build My Business setup; confirm operating mode matches the pilot tier |
| **Escalation** | If operating mode cannot be changed without data loss → escalate to Cody before changing |

---

### Support Category 3: Worker import

| | Detail |
|---|--------|
| **Symptom** | Workers not appearing after import; import fails |
| **Likely cause** | CSV column order mismatch; encoding issues; duplicate records |
| **First check** | Review the import template; compare column order with submitted CSV |
| **Fix** | Reformat the CSV to match the import template; re-import |
| **Escalation** | If >10% of workers fail to import → review the source CSV with the partner before re-attempting |

---

### Support Category 4: Worker save

| | Detail |
|---|--------|
| **Symptom** | Worker profile will not save; error on credential entry |
| **Likely cause** | Duplicate credential record; invalid date format for expiry |
| **First check** | Check for an existing credential with the same name on the worker profile |
| **Fix** | Edit the existing credential rather than adding a duplicate; verify date format (DD/MM/YYYY or ISO) |
| **Escalation** | If error persists after format correction → capture exact error message and escalate |

---

### Support Category 5: Job create

| | Detail |
|---|--------|
| **Symptom** | Job will not save; role requirements not appearing |
| **Likely cause** | Missing required field (date, start time, or at least one role count) |
| **First check** | Confirm date, start time, and at least one role with a count >0 are entered |
| **Fix** | Complete the missing fields; attempt save again |
| **Escalation** | If all required fields are present and save still fails → capture the error state and escalate |

---

### Support Category 6: SmartRank

| | Detail |
|---|--------|
| **Symptom** | SmartRank returns no eligible workers; results seem incorrect |
| **Likely cause** | Requirement catalogue does not match worker credential names; no workers have the required role |
| **First check** | Compare the credential name in the requirement catalogue against the credential name on worker profiles — exact match required |
| **Fix** | Align credential naming between the catalogue and worker profiles; re-run SmartRank |
| **Escalation** | If names match and results are still incorrect → review the SmartRank factor weights; escalate to Cody |

---

### Support Category 7: CredentialGate

| | Detail |
|---|--------|
| **Symptom** | Worker is blocked who should not be; worker passes who should be blocked |
| **Likely cause** | Credential expiry date wrong; requirement catalogue missing or incorrect |
| **First check** | Review the specific worker's credential record; check expiry date and credential name |
| **Fix** | Correct the expiry date or credential name; re-run CredentialGate |
| **Escalation** | If a systematic pattern of false passes occurs → review the entire requirement catalogue for the affected role; escalate if the issue is widespread |

---

### Support Category 8: Role coverage

| | Detail |
|---|--------|
| **Symptom** | Multi-role coverage options not appearing; conservative headcount always shown |
| **Likely cause** | Workers have only one role in their profile; job has only one role requirement |
| **First check** | Confirm at least two workers have multiple roles AND the job has at least two distinct role requirements |
| **Fix** | Update worker profiles with additional roles; ensure job has multiple role counts |
| **Escalation** | If profiles are correct and coverage still does not appear → escalate to Cody; this may indicate a logic issue |

---

### Support Category 9: Publish allocation

| | Detail |
|---|--------|
| **Symptom** | Cannot publish; publish button inactive |
| **Likely cause** | Not all required role slots are filled; unacknowledged warnings remain |
| **First check** | Confirm all role slots have a worker assigned; check for any unacknowledged CredentialGate warnings or FatigueGuard flags |
| **Fix** | Fill all role slots; acknowledge all warnings with a recorded reason; re-attempt publish |
| **Escalation** | If all slots are filled and all warnings acknowledged and publish still fails → capture state and escalate |

---

### Support Category 10: Audit

| | Detail |
|---|--------|
| **Symptom** | Expected audit event not appearing |
| **Likely cause** | Database trigger not firing; action was not completed in the application (e.g., user navigated away before confirming) |
| **First check** | Confirm the action was completed by re-doing it in the application; check if the event appears |
| **Fix** | Complete the action again if it was not confirmed; confirm the AuditIQ event appears |
| **Escalation** | If the database trigger is not firing → escalate to Cody; do not attempt manual AuditIQ entry |
| **HARD RULE** | Never manually insert or delete AuditIQ entries. Escalate all audit discrepancies. |

---

### Support Category 11: Exports

| | Detail |
|---|--------|
| **Symptom** | CSV export is empty or missing data |
| **Likely cause** | Date range does not include the period with data; filter applied that excludes relevant records |
| **First check** | Confirm the date range covers the period with allocations; check for active filters |
| **Fix** | Adjust date range; clear filters; re-export |
| **Escalation** | If data exists in the application and the export is still empty → escalate to Cody |

---

### Support Category 12: Mobile usability

| | Detail |
|---|--------|
| **Symptom** | App does not appear correctly on mobile; partner wants a native app |
| **Likely cause** | PWA not installed; browser zoom level; operating system compatibility |
| **First check** | Confirm whether the partner has added DispatchTalon to their home screen as a PWA |
| **Fix** | Guide the partner through "Add to home screen" in their mobile browser; demonstrate the PWA experience |
| **Escalation** | If partner insists on a native app → refer to roadmap context; do not promise a timeline |
| **Positioning** | "DispatchTalon runs as a Progressive Web App on mobile. It installs from your browser — no app store required." |

---

### Support Category 13: Data cleanup

| | Detail |
|---|--------|
| **Symptom** | Duplicate workers; test data mixed with real data; incorrect historical allocations |
| **Likely cause** | Worker imported twice; demo data not cleaned before pilot started; historical data entered manually with errors |
| **First check** | Identify the specific duplicates or incorrect records; do not bulk-delete without review |
| **Fix** | Deactivate (not hard-delete) duplicate workers; mark incorrect allocations with an audit note |
| **Escalation** | Any request for hard-deletion of allocation records → escalate to Cody; written approval required before proceeding |
| **HARD RULE** | Do not hard-delete allocation or audit records. Deactivate and flag. |

---

## Part 3 — Pilot Health Check Schedule

| Checkpoint | When | Who | Decision point |
|-----------|------|-----|----------------|
| Week 1 health check | Day 5–7 | Cody + dispatcher | Re-kick if no jobs created or no allocation run |
| Week 4 health check | Day 25–28 | Cody + ops manager | Continue / restart / exit if two of three health signals are failing |
| Week 6 mid-pilot review | Day 38–42 | Cody + partner team | Joint decision: continue as-is / revised scope / exit |
| Week 10 commercial check | Day 65–70 | Cody + owner | Continuation: yes / no / maybe + conditions |
| Week 12 exit review | Day 80–84 | Cody + partner team | Final outcome record; continuation decision; data export |

---

## Part 4 — Hard-Stop Conditions

Terminate the pilot immediately if any of these occur. The cost of continuing past these is higher than the cost of exiting.

| Condition | Action |
|-----------|--------|
| Partner publicly claims DispatchTalon "ensures compliance" or "approves a dispatch" | Written notice; data export within 5 business days; stage → `exited` |
| Partner publicly claims "safe to dispatch" or "replaces payroll" | Written notice; data export; stage → `exited` |
| A regulator-related incident and partner attempts to attribute the decision to DispatchTalon | Written notice; legal escalation; data export |
| Partner shares tenant credentials outside the agreed user list | Written notice; tenant access suspended; data export issued |
| Partner attempts to reverse engineer or copy DispatchTalon workflow models | Written notice; tenant access suspended immediately |
| Three consecutive review misses without rescheduling | Honest conversation; if no response in 48 hours → initiate exit |

**Termination process:**
1. Written notice citing the specific clause from the agreement
2. Data export issued within 5 business days
3. Lessons captured for the backlog
4. Lead sheet stage → `exited` with reason recorded

---

*Implementation is the moment where the design partner's trust is built or lost. A partner who cannot log in on day one forms an immediate negative impression that takes weeks to repair. A partner who runs their first real allocation in the first week and sees CredentialGate surface a condition they had not caught forms a positive impression that is very difficult to undo.*
