# DispatchTalon Master Operating Doctrine

**Status:** Internal master reference | May 2026
**Owner:** Pressure Systems
**Classification:** Internal — not for public distribution
**Recovery note:** If every other document is lost, this file teaches the full DispatchTalon operating architecture from first principles to commercial sign-off.

---

## How to use this document

Read Section 1 first. Then navigate by role:

| You are | Start at |
|---------|----------|
| New to the product | Section 1 → 2 → 3 → 4 |
| Implementing a pilot | Section 12 → 5 → 6 |
| Selling or qualifying | Section 10 → 9 → 11 |
| Running AI agents | Section 8 |
| Checking readiness to launch | Section 16 → 17 |
| Everything else is gone | Section 18 |

---

## Section 1 — Executive Doctrine

### What DispatchTalon is

DispatchTalon is a **decision-support layer for dispatch allocation**.

It helps labour, crane, rigging, plant, transport, and lifting teams structure the allocation decision before a job is confirmed and before workers are notified.

It answers:

- What does the job require in terms of roles, credentials, and assets?
- Which workers can realistically cover the required roles?
- What credential conditions, fatigue conditions, or schedule conflicts apply?
- What plant or asset context matters for this job?
- What should be reviewed before dispatch?
- What was selected, why, and by whom?
- What was published to the worker?
- What is recorded in the audit trail?

### What DispatchTalon is not

| Not this | Because |
|----------|---------|
| Not a payroll system | DispatchTalon does not calculate pay, apply award rates, or connect to payroll software |
| Not a scheduling system | DispatchTalon structures allocation decisions; it does not manage project timelines |
| Not a compliance approval system | DispatchTalon surfaces warnings; it does not certify safety, confirm compliance, or approve permits |
| Not an autonomous dispatch engine | DispatchTalon never dispatches without dispatcher confirmation |
| Not a Xero / MYOB integration | Exports are CSV for manual office handoff; no live accounting integration |
| Not a direct SMS sender | The SMS notification step generates a preview that the dispatcher copies and sends manually |
| Not an ERP replacement | DispatchTalon solves the allocation decision problem; it does not manage procurement, invoicing, or contracts |
| Not a lift engineering tool | DispatchTalon provides crane and transport context prompts; it does not calculate lift plans or road approvals |

### Who DispatchTalon is built for

**Primary:** Small-to-mid operators in crane, rigging, labour hire, plant hire, transport, and lifting — companies allocating 5–250 workers, typically 15–40, who rely today on OneNote, spreadsheets, whiteboards, SMS, WhatsApp, phone calls, or memory to manage dispatch.

**Fit profile:** The dispatcher is a named person. The job has multiple roles. Workers carry credentials that expire. The same worker can cover more than one role. The current process does not record why a specific person was selected.

**Poor fit:** Companies that need payroll automation, direct accounting integration, permit approvals, or lift engineering tools as part of their dispatch workflow.

### What pain DispatchTalon solves

1. **Rough notes become unclear jobs.** A phone enquiry becomes a job brief loses specifics. DispatchTalon forces structured job creation.
2. **Worker skills live in someone's head.** When that person is sick or leaves, allocation quality drops. DispatchTalon externalises the credential and role record.
3. **Multi-skilled workers are underused.** One worker who can cover Dogman + Truck Driver is treated as two allocation slots. DispatchTalon surfaces that coverage.
4. **Allocation reasons are not recorded.** When something goes wrong or a question arises, no-one can reconstruct why that person was sent. DispatchTalon records every decision with its reason.
5. **Office admin retypes allocation data.** Data moves from whiteboard to spreadsheet to payroll by hand. DispatchTalon's Export Centre closes that loop.
6. **Credential checking is manual and error-prone.** Expired tickets are caught late. CredentialGate surfaces these at the allocation step.
7. **Fatigue and schedule conflicts are invisible.** Consecutive shifts or back-to-back jobs are caught only when someone complains. FatigueGuard makes them visible before dispatch.

### Why the category matters

Dispatch in labour, crane, and lifting is not a scheduling problem. It is a **decision problem under constraint**. The constraints are credentials, fatigue, role coverage, asset availability, and site requirements. Most existing tools treat dispatch as a calendar fill. DispatchTalon treats it as a structured reasoning problem that needs a record.

### Why role coverage matters

A four-role job does not automatically require four people. A worker who holds Dogman and Truck Driver credentials can cover two roles. DispatchTalon surfaces this. The commercial wedge: **a job may need four roles, not four people.** That is a direct cost and coordination saving.

### Why audit matters

In crane, rigging, and lifting, the question "why was that person dispatched?" can be asked by:

- The partner's own management after an incident
- A client or principal contractor
- A regulator or insurer

If the answer is "because the dispatcher remembered," that is not sufficient. DispatchTalon's append-only AuditIQ log creates a durable record of: who ran allocation, what SmartRank recommended, what was overridden, what warning was acknowledged, and what was published to the worker.

### Why the dispatcher remains the decision-maker

DispatchTalon is explicit about this at every step. The product surfaces recommendations. It does not submit them. The dispatcher reviews and confirms. This is not a liability-hedging word game — it reflects the real structure of dispatch work. The dispatcher has context the software does not have (the worker called in sick ten minutes ago, the client specifically asked for a certain operator, the site requires an additional condition). DispatchTalon supports that context; it does not override it.

---

## Section 2 — Core Beliefs

### Belief 1: Dispatch is a decision, not just a schedule

**Explanation:** Putting a name in a roster slot is the outcome of a decision about credentials, roles, availability, fatigue, and suitability. Most tools record the outcome but not the decision process.

**Real-world example:** A rigger is allocated to a job, but the job also requires a working-at-heights ticket the rigger does not hold. The dispatcher did not know. The job is delayed. No-one has a record of what was checked.

**Product support:** SmartRank and CredentialGate make the credential-and-role check explicit before the name is confirmed.

**What agents/workers must not do:** Do not treat SmartRank output as a final decision. It is a structured recommendation. The dispatcher confirms.

---

### Belief 2: A job may require several roles without requiring several people

**Explanation:** Multi-skilled workers can cover multiple roles. Not surfacing this creates unnecessary headcount and cost.

**Real-world example:** A crane job requires a Dogman and a Truck Driver. One worker holds both tickets. Conservative allocation puts two people on the job. Role-coverage allocation puts one.

**Product support:** Multi-role allocation coverage shows compatible combinations and flags the minimum headcount against the conservative headcount.

**What agents/workers must not do:** Do not claim that a multi-role combination is safe or compliant. Use: "review required, confirm suitability."

---

### Belief 3: Good dispatchers already think in role coverage; software must respect that

**Explanation:** Experienced dispatchers already know which workers can double up. They should not have to fight the software to record that reasoning.

**Real-world example:** A dispatcher who mentally knows that "Mick can do both" should be able to confirm that in DispatchTalon, not work around it.

**Product support:** Multi-role allocation coverage is built into SmartRank output, not bolted on. The dispatcher can confirm the minimum headcount allocation without being forced into a conservative slot-fill.

**What agents/workers must not do:** Do not redesign the allocation flow to suit the software's convenience. The software serves the dispatcher.

---

### Belief 4: The system should reduce mental load, not remove human judgement

**Explanation:** The value is remembering and surfacing what the dispatcher should check — not making the check on their behalf.

**Real-world example:** CredentialGate flags that a worker's White Card expires in 14 days. The dispatcher still decides whether that matters for this job.

**Product support:** All warnings are surfaced as review prompts, not automated rejections. Overrides are allowed with a recorded reason.

**What agents/workers must not do:** Do not configure blocks that prevent a dispatcher from overriding a system warning. Override with reason is always available.

---

### Belief 5: The dispatcher remains accountable for the final decision

**Explanation:** DispatchTalon creates evidence that the decision was supported by good information. It does not take accountability away from the human who approved the allocation.

**Real-world example:** An incident occurs. The question is "what did the dispatcher know and check before making the call?" The AuditIQ log answers that. It does not answer "did the system approve it" — the system does not approve anything.

**Product support:** The publish step requires a dispatcher action. The audit records the dispatcher's confirmation, not an automated approval.

**What agents/workers must not do:** Never describe DispatchTalon as approving a dispatch. Use: "the dispatcher published the allocation."

---

### Belief 6: Audit trails protect memory, handover, and review

**Explanation:** Dispatch decisions fade from memory. Teams change. Incidents can be months later. An append-only audit trail is not bureaucracy — it is operational protection.

**Real-world example:** A worker was sent to a job six weeks ago. The client disputes whether the right credential level was used. The AuditIQ log shows: SmartRank recommendation, override reason (if any), dispatcher who confirmed, time of publish.

**Product support:** AuditIQ is append-only and trigger-enforced. Entries cannot be deleted through normal application flow.

**What agents/workers must not do:** Do not delete audit entries. Do not allow "cleanup" that removes allocation history.

---

### Belief 7: Clean setup creates trust

**Explanation:** A tenant with a complete worker list, accurate credentials, and real jobs is credible. A tenant with skeleton data produces outputs that operators cannot trust.

**Real-world example:** If a worker's credentials are not imported, CredentialGate flags everyone as missing a credential. The dispatcher loses trust in the system within a week.

**Product support:** Build My Business setup, worker import, and requirement catalogue are the first three steps in every implementation. They are not optional.

**What agents/workers must not do:** Do not offer to begin allocation in a tenant before the worker list and requirement catalogue are populated with real data.

---

### Belief 8: Wrong input creates wrong allocation

**Explanation:** SmartRank is only as good as the data fed into it. Incorrect credentials, missing roles, or wrong fatigue records produce unreliable recommendations.

**Real-world example:** A worker is marked as holding a Rigger ticket they do not hold. They are recommended for a rigging job. CredentialGate does not block them because the record is wrong.

**Product support:** There is no product-level override of this. Clean data is an operational discipline, not a software feature.

**What agents/workers must not do:** Do not reassure a partner that SmartRank output is reliable if the underlying data has not been reviewed for accuracy.

---

### Belief 9: Export-first beats premature integration

**Explanation:** Getting allocation data into a CSV that an admin can work with is faster, more reliable, and less risky than building a live integration with an accounting system.

**Real-world example:** A company uses MYOB. Building a live MYOB integration takes months and introduces sync failure risk. Exporting a payroll-prep CSV and importing it to MYOB takes two minutes.

**Product support:** The Export Centre covers Workers, Jobs, Allocations, Payroll-prep, Invoice-prep, Audit, and Metrics as CSVs available at any time.

**What agents/workers must not do:** Do not promise or imply that Xero/MYOB/HRIS integration is on a specific timeline. The roadmap document exists; do not quote it as a commitment.

---

### Belief 10: Manual publish beats accidental notification

**Explanation:** An automated SMS that goes to the wrong worker, or goes before the dispatcher has confirmed, damages trust immediately. Manual review before publish prevents this.

**Real-world example:** SmartRank recommends a worker who called in sick 20 minutes ago. If the SMS went automatically, that worker receives a notification for a job they cannot attend. Manual publish lets the dispatcher catch this.

**Product support:** The SMS notification step generates a preview message that the dispatcher reviews, copies, and sends manually. DispatchTalon never sends directly.

**What agents/workers must not do:** Do not describe DispatchTalon as sending SMS. Use: "DispatchTalon generates the notification text; the dispatcher copies and sends."

---

### Belief 11: A pilot must prove behaviour, not just features

**Explanation:** A partner who knows how to create a job is not the same as a partner who has changed their dispatch behaviour because of DispatchTalon. Behaviour change is the evidence of value.

**Real-world example:** A partner reaches week 12. They have clicked through every feature. But they still run all allocations in OneNote and import them to DispatchTalon retrospectively. That is not a successful pilot.

**Product support:** Success metrics distinguish operational metrics (are they using it?), quality metrics (is the work better?), and commercial metrics (will they pay?). Feature knowledge alone does not clear any metric.

**What agents/workers must not do:** Do not score a pilot as successful because all features were demonstrated. Score it on whether allocation decisions were made inside DispatchTalon on real jobs.

---

### Belief 12: The product should earn trust before asking for deep integration

**Explanation:** Asking an operator to connect their payroll system or ERP to DispatchTalon before the pilot proves value is premature and a trust risk.

**Real-world example:** A partner agrees to "look at the Xero integration" before the pilot ends. This absorbs engineering time and creates an expectation that cannot yet be met. If the pilot fails, the integration work is wasted.

**Product support:** The pilot scope explicitly excludes Xero/MYOB integration and lists CSV export as the office handoff method. This is a feature boundary, not a gap.

**What agents/workers must not do:** Do not begin integration scoping with a partner who has not yet cleared Gate 3 (scope agreement) and signed a pilot agreement.

---

## Section 3 — Market Problem

### Current dispatch systems used by target operators

| System | How they use it | Core limitation |
|--------|-----------------|-----------------|
| OneNote | Job notes, worker lists, rough schedules | Captures conversation, does not structure the decision |
| Spreadsheets | Worker rosters, credential tracking | No allocation logic, no audit, brittle at scale |
| Whiteboards | Shift planning, job assignment | Ephemeral — no record, no searchability |
| SMS / WhatsApp | Worker notification, quick schedule changes | No formal record, no credential check, informal |
| Phone calls | Confirmation, last-minute changes | Nothing recorded, memory-dependent handover |
| Memory | "Dave always does this job" logic | Disappears when the person leaves |
| Generic job systems | Ticket management, some scheduling | Not built for dispatch allocation or role-coverage logic |
| Large ERP/dispatch systems | Full-feature but very heavy | Expensive, complex, overkill for 15–40 person operators; still may not explain decisions |

### The OneNote comparison

| OneNote | DispatchTalon |
|---------|---------------|
| Captures the conversation | Structures the decision |
| Free-form notes | Structured job brief with role counts |
| Worker list is a text block | Worker profiles with credentials and roles |
| No credential checking | CredentialGate surfaces credential conditions |
| No role-coverage logic | SmartRank and multi-role coverage |
| No fatigue awareness | FatigueGuard surfaces consecutive shift conditions |
| No allocation record | AuditIQ records every decision and override |
| No export | Export Centre produces CSVs for admin handoff |

### Common market failure patterns

1. **Rough notes become unclear jobs.** A phone enquiry says "we need a crew Thursday, three guys." By Thursday, the requirements have evolved but the note hasn't. Workers arrive under-briefed.
2. **Worker skills live in someone's head.** The dispatcher who knows "Mick can do Dogman and Truck Driver" leaves. The next dispatcher over-allocates every job.
3. **Tickets/credentials are manually checked.** Someone calls the worker. The expiry date is guessed. An expired licence reaches site.
4. **Multi-skilled workers are underused.** A Rigger/Dogman combination is split into two separate roles with two separate people because no system surfaces the coverage.
5. **Jobs are over-allocated.** Four people are sent on a job that needs two, because the dispatcher could not verify coverage. Cost: real.
6. **Jobs are under-allocated.** One person is sent because the job description was unclear about the secondary credential requirement.
7. **Role overlap is not clearly reviewed.** A worker is allocated to two overlapping jobs because the schedule conflict was in two different spreadsheets.
8. **Allocation reasons are not recorded.** An incident review requires reconstructing who decided what, based on memory and incomplete notes.
9. **Worker notification is informal.** A WhatsApp message is the formal notification. No read receipt, no structured data.
10. **Office/admin retypes data.** Allocation data from the whiteboard becomes a timesheet entry becomes a payroll row by manual re-entry at each step.
11. **Management cannot see why decisions happened.** The dashboard shows what was allocated; it does not show why, what was checked, or what was overridden.

---

## Section 4 — Product Capability Map

All capabilities are live as of Phase 1. Each entry states what the feature does, what it does not claim, who uses it, what data it needs, and what it produces.

### 4.1 Build My Business

**Does:** Company-level setup — operating mode, worker caps, job caps, asset caps, support tier, notifications preference.
**Does not claim:** This is not legal entity registration or regulatory setup.
**Used by:** Company owner / admin at onboarding.
**Needs:** Operating mode decision (labour-only / plant+labour / plant-only), company name, user count intent.
**Produces:** Configured tenant baseline for all downstream features.

---

### 4.2 Labour-only mode

**Does:** Hides plant and asset allocation workflows; focuses all allocation logic on worker roles and credentials.
**Does not claim:** Labour-only mode does not disable plant tracking if assets are added later.
**Used by:** Labour hire, scaffolding, rigging crews without managed plant.
**Needs:** Operating mode set to labour-only in Build My Business.
**Produces:** Simplified allocation workflow scoped to people and roles.

---

### 4.3 Plant + labour mode

**Does:** Enables asset tracking alongside worker allocation; allows plant numbers to appear in job context and allocation views.
**Does not claim:** This is not a full fleet management system.
**Used by:** Crane operators, transport companies, plant hire operators.
**Needs:** Asset register populated.
**Produces:** Allocation context that includes both worker and plant selection.

---

### 4.4 Company requirement catalogue

**Does:** Defines the standard credential and certification requirements the company expects workers to hold for each role.
**Does not claim:** The catalogue is the company's own standard, not a regulatory compliance register.
**Used by:** Admin, operations manager at setup.
**Needs:** A list of roles the company uses and which credentials each role requires.
**Produces:** The reference set CredentialGate checks against during allocation.

---

### 4.5 Worker import

**Does:** Bulk import of workers from CSV. Maps name, role, credential, expiry.
**Does not claim:** Import does not validate credentials against external databases.
**Used by:** Admin at onboarding; ongoing for new starters.
**Needs:** Worker list in any CSV format with name, roles, credential names, expiry dates.
**Produces:** Active worker register with roles and credentials in the tenant.

---

### 4.6 Worker profile management

**Does:** Create, edit, and deactivate individual worker records. Role multi-select, credential management, expiry dates.
**Does not claim:** Worker profiles are not HR records and do not contain payroll data.
**Used by:** Admin, operations manager.
**Needs:** Accurate role and credential data for each worker.
**Produces:** Single source of truth for each worker's allocation eligibility.

---

### 4.7 Worker role multi-select

**Does:** Each worker can hold multiple roles (e.g., Truck Driver, Dogman, Rigger). SmartRank uses all applicable roles when building the allocation.
**Does not claim:** Multi-role does not automatically mean multi-role is appropriate for every job — review is required.
**Used by:** Admin when setting up or editing a worker profile.
**Needs:** Accurate role list for the worker.
**Produces:** Workers who are eligible for multiple allocation paths in SmartRank.

---

### 4.8 Credential and VOC management

**Does:** Records credentials (licence, ticket, VOC, card), their type, issue date, and expiry. CredentialGate references these during allocation.
**Does not claim:** DispatchTalon does not verify credentials against issuing authorities.
**Used by:** Admin. Viewed by dispatcher during allocation.
**Needs:** Credential name, expiry date, and optionally issue date per worker.
**Produces:** Credential conditions that CredentialGate surfaces as warnings or blocks.

---

### 4.9 Job creation

**Does:** Structured job intake — site, date, start time, duration, notes, role count requirements.
**Does not claim:** Job creation does not generate a work order, contract, or compliance document.
**Used by:** Dispatcher, operations manager.
**Needs:** Site, date, start time, and role/count requirements.
**Produces:** A structured job record that SmartRank can run against.

---

### 4.10 Job Brief Import

**Does:** Bulk import of jobs from CSV or rough text. Parses into structured job records.
**Does not claim:** Import does not guarantee correct parsing of free-form text. Review required.
**Used by:** Admin or dispatcher when a week's jobs are available in advance.
**Needs:** Job list in CSV or structured text format.
**Produces:** Batch of structured job records ready for allocation.

---

### 4.11 Role counts

**Does:** Each job specifies how many of each role are required (e.g., Rigger × 2, Dogman × 1).
**Does not claim:** Role counts are a starting assumption; they can be reduced by role-coverage allocation.
**Used by:** Dispatcher during job creation.
**Needs:** Dispatcher's understanding of job requirements.
**Produces:** The role-and-count specification that SmartRank allocates against.

---

### 4.12 Separate-worker-only settings

**Does:** Flags certain role combinations as requiring distinct workers (no single worker can cover both roles for this job).
**Does not claim:** This is not a regulatory mandate. It is the company's operational preference.
**Used by:** Admin or operations manager at Build My Business or job level.
**Needs:** Company rule about which roles must be distinct on a job.
**Produces:** A constraint in SmartRank that forces separate allocation for flagged combinations.

---

### 4.13 Credential taxonomy

**Does:** Provides the correct credential naming conventions for crane, rigging, labour, and plant sectors (White Card, Rigger — Basic/Intermediate/Advanced, Dogman, Crane Operator, VOC, etc.).
**Does not claim:** DispatchTalon's taxonomy is not the regulatory authority on credential names. Operators should confirm against their sector's actual requirements.
**Used by:** Admin at setup.
**Needs:** Company's current credential list.
**Produces:** Standardised credential names that CredentialGate references consistently.

---

### 4.14 SmartRank

**Does:** Seven-factor ranking algorithm that scores workers against a job's requirements. Factors include: credential match, role match, fatigue score, schedule conflict, worker availability, multi-role coverage potential, and any preference flags.
**Does not claim:** SmartRank does not approve an allocation. It produces a ranked recommendation list.
**Used by:** Dispatcher when running allocation for a job.
**Needs:** A structured job with role counts and an active worker register with credentials.
**Produces:** Ranked worker list with scores, flags, and role-coverage options for dispatcher review.

---

### 4.15 CredentialGate

**Does:** Checks each worker's credentials against the job's requirement catalogue at allocation time. Surfaces warnings (expiring soon), blocks (expired/missing), and passes (valid).
**Does not claim:** CredentialGate does not verify credentials against external authorities. It checks the data in the tenant against the company's own requirement catalogue.
**Used by:** Dispatcher (reviewed as part of SmartRank output). AuditIQ records the outcome.
**Needs:** Accurate credential records in worker profiles. Completed requirement catalogue.
**Produces:** Credential status per worker per job. Audit events for each check.

---

### 4.16 FatigueGuard

**Does:** Detects consecutive shift conditions and flags workers who may be affected. Surfaced as a review warning during SmartRank output.
**Does not claim:** FatigueGuard is not a fatigue risk assessment tool and does not comply with any specific fatigue management standard. It flags conditions for dispatcher review.
**Used by:** Dispatcher. Reviewed before confirming allocation.
**Needs:** Allocation history for the worker over a configurable window.
**Produces:** Fatigue condition flag in SmartRank output. Audit event if acknowledged and overridden.

---

### 4.17 Schedule conflict awareness

**Does:** Detects workers who are already allocated to another job on the same date and time window. Flags as a conflict in SmartRank output.
**Does not claim:** Schedule conflict detection only knows about jobs in the DispatchTalon tenant. External bookings in other systems are not visible.
**Used by:** Dispatcher during allocation.
**Needs:** All jobs for the period in the tenant with correct dates and times.
**Produces:** Conflict flag for affected workers. Dispatcher can override with reason.

---

### 4.18 Multi-role allocation coverage

**Does:** Shows which workers can cover multiple required roles in a single job. Calculates conservative headcount (one slot per role) vs suggested minimum headcount (using multi-role workers).
**Does not claim:** Multi-role coverage suggestions are reviewed by the dispatcher. DispatchTalon does not confirm that a multi-role combination is safe or appropriate.
**Used by:** Dispatcher when reviewing SmartRank output.
**Needs:** Workers with multiple roles in their profile. Jobs with multiple role requirements.
**Produces:** Role-coverage allocation suggestions with minimum and conservative headcount comparison.

---

### 4.19 Conservative vs suggested headcount

**Does:** Shows two allocation options side by side. Conservative: one worker per role slot, no multi-role assumptions. Suggested: minimum workers using multi-role coverage.
**Does not claim:** The suggested minimum is not a recommendation that fewer workers is always better. Some jobs require separate workers for operational or safety reasons.
**Used by:** Dispatcher reviewing SmartRank output.
**Needs:** Multi-role coverage logic enabled. Workers with multiple roles.
**Produces:** Headcount comparison that the dispatcher uses to decide allocation depth.

---

### 4.20 Review warnings

**Does:** Surfaces non-blocking conditions that require dispatcher acknowledgement before the allocation can be published. Examples: credential expiring within 30 days, consecutive shift condition, first-time role combination.
**Does not claim:** Acknowledging a review warning does not constitute compliance approval.
**Used by:** Dispatcher before confirming allocation.
**Needs:** Configurable warning rules. Accurate credential and allocation history data.
**Produces:** Warning acknowledgement in AuditIQ. Dispatcher confirmation on file.

---

### 4.21 Allocation override reasons

**Does:** When a dispatcher overrides a CredentialGate block, FatigueGuard flag, or review warning, they must enter a reason. The reason is stored in AuditIQ.
**Does not claim:** An override reason does not mean the override was appropriate. It means the decision was recorded.
**Used by:** Dispatcher.
**Needs:** A dispatcher who is aware of the condition being overridden.
**Produces:** AuditIQ entry: what was overridden, the reason given, and who gave it.

---

### 4.22 Publish allocation

**Does:** Confirms the allocation and generates the notification text for each allocated worker.
**Does not claim:** Publish does not send anything. It generates the content for manual dispatch.
**Used by:** Dispatcher after reviewing and confirming SmartRank output.
**Needs:** A confirmed allocation with all required roles filled.
**Produces:** Allocation record in AuditIQ. SMS preview text per worker ready for manual sending.

---

### 4.23 SMS preview / copy / manual publish

**Does:** Generates a structured SMS-format notification per worker with job details, time, location, and role. The dispatcher copies and sends it via their own messaging channel.
**Does not claim:** DispatchTalon does not send SMS directly. It does not connect to Twilio, MessageBird, or any SMS gateway.
**Used by:** Dispatcher after publishing allocation.
**Needs:** Published allocation with worker details and job details.
**Produces:** Ready-to-copy notification text per worker.

---

### 4.24 AuditIQ

**Does:** Append-only audit log for all allocation events. Records: job created, SmartRank run, CredentialGate check, FatigueGuard check, warning acknowledged, override with reason, allocation confirmed, allocation published.
**Does not claim:** AuditIQ is an operational record. It is not a legal record, a compliance certificate, or a regulator-approved audit trail.
**Used by:** Dispatcher (implicitly — all actions create entries). Operations manager and owner on review.
**Needs:** Active allocation workflow.
**Produces:** Chronological, immutable event log per job and per worker.

---

### 4.25 Metrics

**Does:** Aggregated operational metrics — job volume, allocation volume, publish rate, CredentialGate event counts, FatigueGuard event counts, override counts.
**Does not claim:** Metrics are operational measures, not KPI benchmarks or safety performance indicators.
**Used by:** Operations manager, Cody during weekly pilot review.
**Needs:** Active allocation data over a period.
**Produces:** Dashboard view and metrics CSV for export.

---

### 4.26 Export Centre

**Does:** One-click CSV exports for all major data categories.
**Does not claim:** Exports are for office handoff and administration. They do not sync automatically to any system.
**Used by:** Admin, operations manager.
**Needs:** Active data in the tenant.
**Produces:** CSV files ready for import into payroll, invoicing, or other office systems.

---

### 4.27–4.33 Export types

| Export | Contents | Primary use |
|--------|----------|-------------|
| Workers CSV | Worker list, roles, credentials, expiry | HR review, payroll mapping |
| Jobs CSV | Job list, dates, sites, role requirements | Operations review, client reporting |
| Allocations CSV | Worker + job + role + confirmation state | Payroll-prep, operational audit |
| Payroll-prep CSV | Worker, hours, rate code reference | Import to payroll system |
| Invoice-prep CSV | Job, client, hours, rates reference | Invoice generation in accounting software |
| Audit CSV | All AuditIQ events chronologically | Management review, incident investigation |
| Metrics CSV | Aggregated operational metrics | Pilot performance review |

---

### 4.34 Asset register

**Does:** Inventory of company plant and equipment with asset numbers, type, category, and status.
**Does not claim:** The asset register is not a compliance register or inspection log.
**Used by:** Admin. Referenced by dispatcher in plant+labour mode.
**Needs:** Asset number, type, and category for each piece of plant.
**Produces:** Asset records available for job assignment in plant+labour mode.

---

### 4.35 Plant number / asset number references

**Does:** Links a specific asset (crane, truck, plant) to a job allocation so the asset is visible in the allocation record.
**Does not claim:** Asset reference is informational context. DispatchTalon does not manage asset maintenance, compliance inspections, or registration.
**Used by:** Dispatcher in plant+labour mode.
**Needs:** Populated asset register.
**Produces:** Asset reference in the job allocation record and in exports.

---

### 4.36 Crane / counterweight / transport review context

**Does:** Provides structured review prompts for crane jobs — counterweight configuration, transport requirements, crane model reference. Prompts the dispatcher to consider these before publishing.
**Does not claim:** DispatchTalon does not calculate lift capacities, prepare lift plans, or approve lifts. It provides context prompts only.
**Used by:** Dispatcher for crane and heavy lift jobs.
**Needs:** Crane type, job details, site access notes.
**Produces:** Pre-dispatch review checklist for the dispatcher to confirm before publish.

---

### 4.37 Road-access / NHVR review prompts

**Does:** Prompts dispatcher to confirm road access and NHVR (or equivalent authority) requirements have been considered before publishing a job involving oversized or overmass transport.
**Does not claim:** DispatchTalon does not apply for permits, calculate route compliance, or provide legal road-access advice.
**Used by:** Dispatcher for transport and heavy lift jobs involving oversize/overmass movements.
**Needs:** Job type indicator and transport vehicle type.
**Produces:** Confirmation prompt recorded in AuditIQ.

---

### 4.38–4.40 Infrastructure and access

| Capability | Description | Security note |
|-----------|-------------|---------------|
| Tenant isolation | Each company operates in a fully isolated tenant. No company can see another company's data. | Enforced at database level — not just API-level filtering. |
| Forced password rotation | On first login, the user must change their password. No default credentials persist. | Pre-set passwords from provisioning expire on first use. |
| Clean tenant setup | New tenants start with no sample data. All data entered is the partner's real operational data. | Prevents demo-data contamination in live pilot tenants. |

---

## Section 5 — Decision-Layer Architecture

The DispatchTalon decision flow has sixteen layers. Each layer is a checkpoint where data is transformed, evaluated, or confirmed. Missing or corrupting a layer degrades the recommendation quality downstream.

### Layer 1: Operating mode decision

| Attribute | Detail |
|-----------|--------|
| Input | Company setup: labour-only, plant+labour, or plant-only |
| Logic | Determines which features are active and which allocation flows are available |
| Output | Tenant configuration scoped to operating mode |
| Risk if wrong | Plant features shown to labour-only operators cause confusion and undermine trust |
| Human review | Company owner / admin at Build My Business setup |
| Audit implication | Operating mode is recorded in tenant configuration; does not generate AuditIQ events per-allocation |

---

### Layer 2: Build My Business setup

| Attribute | Detail |
|-----------|--------|
| Input | Company name, operating mode, user caps, worker caps, job caps |
| Logic | Creates the governed operating envelope for the tenant |
| Output | Active tenant with correct caps and mode |
| Risk if wrong | Caps set too low block real operations; caps set too high misrepresent the pilot tier |
| Human review | Admin confirms with Cody at kick-off |
| Audit implication | Setup events recorded at tenant level |

---

### Layer 3: Requirement catalogue decision

| Attribute | Detail |
|-----------|--------|
| Input | Company's role list and credential requirements per role |
| Logic | Maps roles to required credentials; CredentialGate references this mapping |
| Output | Company-specific requirement catalogue |
| Risk if wrong | Wrong role-credential mapping causes incorrect CredentialGate outcomes |
| Human review | Operations manager or owner confirms at setup |
| Audit implication | Catalogue changes are version-tracked |

---

### Layer 4: Worker role matching

| Attribute | Detail |
|-----------|--------|
| Input | Worker profile with multi-role selection |
| Logic | SmartRank uses all applicable roles when building allocation candidates |
| Output | Workers available as candidates for multiple role requirements |
| Risk if wrong | Missing roles mean workers are not considered for valid role slots |
| Human review | Admin reviews worker profiles before first allocation run |
| Audit implication | Role changes to worker profiles are logged |

---

### Layer 5: CredentialGate

| Attribute | Detail |
|-----------|--------|
| Input | Worker credential records + job requirement catalogue |
| Logic | Compares worker's credentials against the requirements for each role in the job |
| Output | Pass / Warning (expiring) / Block (expired or missing) per worker per role |
| Risk if wrong | Inaccurate credential records produce false passes or unnecessary blocks |
| Human review | Dispatcher reviews all CredentialGate outputs before confirming allocation |
| Audit implication | Every CredentialGate check generates an AuditIQ event including outcome and any override |

---

### Layer 6: FatigueGuard

| Attribute | Detail |
|-----------|--------|
| Input | Worker's allocation history over a configurable lookback window |
| Logic | Detects consecutive shift conditions above a threshold |
| Output | Fatigue flag in SmartRank output for affected workers |
| Risk if wrong | Incomplete allocation history produces false clears |
| Human review | Dispatcher reviews and acknowledges before allocation is confirmed |
| Audit implication | Fatigue flag acknowledgement and override recorded in AuditIQ |

---

### Layer 7: Schedule conflict detection

| Attribute | Detail |
|-----------|--------|
| Input | Worker's existing allocations and the new job's date/time window |
| Logic | Checks for time overlap between new job and existing allocations |
| Output | Conflict flag per affected worker |
| Risk if wrong | External bookings not in the tenant are invisible; partial visibility is a known limitation |
| Human review | Dispatcher reviews conflict before confirming |
| Audit implication | Conflict acknowledgement recorded in AuditIQ |

---

### Layer 8: SmartRank

| Attribute | Detail |
|-----------|--------|
| Input | Job requirements (roles, counts, credentials, date/time) + worker register |
| Logic | Seven-factor scoring: credential match, role match, fatigue, conflict, availability, multi-role potential, preference flags |
| Output | Ranked candidate list per role, with flags and role-coverage options |
| Risk if wrong | Poor data quality in any upstream layer degrades rankings; rankings are not a guarantee |
| Human review | Dispatcher reviews the full ranked list, not just the top recommendation |
| Audit implication | SmartRank run recorded in AuditIQ with input parameters and output state |

---

### Layer 9: Multi-role coverage

| Attribute | Detail |
|-----------|--------|
| Input | Workers with multiple roles + job with multiple role requirements |
| Logic | Identifies workers who can cover ≥2 required roles; calculates minimum vs conservative headcount |
| Output | Role-coverage allocation options with headcount comparison |
| Risk if wrong | A review-required combination confirmed without review creates an unrecorded assumption |
| Human review | Dispatcher confirms role-coverage allocation is appropriate for the job and site |
| Audit implication | Multi-role allocation confirmation recorded in AuditIQ |

---

### Layer 10: Role compatibility review

| Attribute | Detail |
|-----------|--------|
| Input | Proposed role combination for a single worker |
| Logic | Checks combination against compatible / review-required / discouraged / disallowed classification (see Section 6) |
| Output | Compatibility classification shown to dispatcher |
| Risk if wrong | A disallowed combination presented as compatible creates a misallocation risk |
| Human review | Any review-required or discouraged combination requires explicit dispatcher confirmation |
| Audit implication | Combination classification and confirmation recorded in AuditIQ |

---

### Layer 11: Conservative vs suggested headcount

The canonical example:

**Job requires:**
- Truck Driver × 2
- Dogman × 1
- Rigger × 1
- Total conservative headcount: 4 workers

**SmartRank role-coverage options:**
- Worker A: Truck Driver + Dogman (covers 2 roles)
- Worker B: Truck Driver + Rigger (covers 2 roles)
- Minimum suggested headcount: 2 workers

**Dispatcher confirms or reverts to conservative.** DispatchTalon does not automatically select minimum headcount.

---

### Layer 12: Asset / plant selection

| Attribute | Detail |
|-----------|--------|
| Input | Asset register + job type |
| Logic | Shows available assets matching the job's plant requirements |
| Output | Asset selection linked to job allocation record |
| Risk if wrong | Wrong asset linked to job produces incorrect documentation |
| Human review | Dispatcher confirms asset selection |
| Audit implication | Asset selection recorded in allocation record and exports |

---

### Layer 13: Crane / transport review

| Attribute | Detail |
|-----------|--------|
| Input | Job type, crane/vehicle details, site access notes |
| Logic | Prompts review of counterweight, transport, and access conditions before publish |
| Output | Pre-dispatch review checklist confirmed by dispatcher |
| Risk if wrong | Skipped review means the dispatcher publishes without considering site-specific conditions |
| Human review | Dispatcher must confirm each prompt explicitly |
| Audit implication | Review confirmation and any notes recorded in AuditIQ |

---

### Layer 14: Publish allocation

| Attribute | Detail |
|-----------|--------|
| Input | Confirmed allocation with all role slots filled and all warnings resolved |
| Logic | Locks the allocation, generates notification text per worker, records publish event |
| Output | Published allocation + SMS preview text |
| Risk if wrong | Publishing before all warnings are resolved creates an incomplete record |
| Human review | Final dispatcher action — cannot be undone without a recorded amendment |
| Audit implication | Publish event is the definitive AuditIQ record for the allocation |

---

### Layer 15: Audit / override trail

| Attribute | Detail |
|-----------|--------|
| Input | All events from Layers 5–14 |
| Logic | Append-only trigger-enforced log; each event has timestamp, user, type, and payload |
| Output | Chronological AuditIQ record per job and per worker |
| Risk if wrong | Gaps in the audit trail undermine its value as evidence |
| Human review | Operations manager reviews periodically; export for incident review |
| Audit implication | Is the audit itself |

---

### Layer 16: Export handoff

| Attribute | Detail |
|-----------|--------|
| Input | Published allocations, worker data, job data, audit events, metrics |
| Logic | User triggers CSV generation; tenant data is packaged per export type |
| Output | CSV file downloaded by admin |
| Risk if wrong | Exported data used for payroll without review can contain allocation changes made after export |
| Human review | Admin reviews exported CSV before importing to payroll or invoicing |
| Audit implication | Export events recorded (who exported, what type, when) |

---

## Section 6 — Role Coverage Doctrine

### Core concepts

| Concept | Definition |
|---------|-----------|
| Role requirement | A specific role that a job requires to be filled (e.g., Rigger × 2) |
| Worker role | A role a worker is qualified and recorded as holding |
| Role coverage | A worker covering ≥2 required roles in a single allocation |
| Role count | The number of role slots required for a job regardless of worker count |
| Distinct worker requirement | A rule that certain roles must be held by separate workers on a given job |
| Compatible combination | Two roles that a single worker commonly holds and that can be confirmed without a specific review flag |
| Review-required combination | Two roles that may be held by one worker but that require explicit dispatcher confirmation before allocation |
| Discouraged combination | Two roles that should rarely be combined in a single allocation; requires a recorded reason |
| Disallowed combination | Two roles that the company rules prohibit being combined; no override available without admin action |
| Override reason | A dispatcher's recorded explanation for acknowledging a warning or block |

---

### Role combination examples

| Combination | Classification | Required review | Product behaviour | Recommended warning language |
|-------------|---------------|-----------------|-------------------|-------------------------------|
| Dogman + Rigger | Review required | Yes — confirm suitability for the specific job | Surface as review-required in SmartRank; allow with confirmed reason | "Review required: Dogman + Rigger combined. Confirm this is suitable for the job and site procedure." |
| Dogman + Truck Driver | Compatible | Dispatcher review | Show as coverage option; no block | "Coverage confirmed: Dogman + Truck Driver. Dispatcher to confirm." |
| Rigger + Truck Driver | Compatible | Dispatcher review | Show as coverage option; no block | "Coverage confirmed: Rigger + Truck Driver. Dispatcher to confirm." |
| Dogman + Electrical Spotter | Review required | Yes — proximity to electrical work requires specific review | Flag for review; record acknowledgement | "Review required: Dogman working as Electrical Spotter on same job. Confirm site and client procedure." |
| Rigger + EWP Operator | Compatible | Dispatcher review | Coverage option; no block | "Coverage confirmed: Rigger + EWP Operator. Dispatcher to confirm." |
| Lift Supervisor + Rigger | Review required | Yes — supervisory + operative combination requires review | Flag for review | "Review required: Lift Supervisor also allocated as Rigger. Confirm suitability and company procedure." |
| Crane Operator + Dogman | Discouraged | Yes — typically requires separate workers for operational reasons | Flag as discouraged; record reason required | "Discouraged: Crane Operator and Dogman roles typically require separate workers. Record reason for combining." |

---

### Vocabulary rules for role coverage

Never use: `safe`, `compliant`, `approved`, `legal`, `certified`

Always use:
- `review required`
- `confirm suitability`
- `company, site, and client procedure should be checked`
- `dispatcher confirmation required`
- `record reason for this combination`

---

## Section 7 — User Types and Training Paths

Full training curricula are in `DISPATCHTALON_TRAINING_CURRICULUM.md`. This section provides the path summary.

### Training path overview

| User type | First priority | Core competency | Must not touch |
|-----------|---------------|-----------------|----------------|
| New dispatcher | Build My Business → Add workers → Create jobs | SmartRank + role coverage + publish | AuditIQ entries — read only |
| Operations manager | Product architecture → metrics → override review | Metrics + audit review + pilot reviews | Do not delete allocations |
| Company owner | Section 1 + Pilot and Pricing | Commercial metrics | Do not change live worker credentials without review |
| Admin / office | Export Centre → CSV workflows | Worker import + CSV exports | Do not run SmartRank |
| Support worker | Sections 1–6 + Section 13 | All support categories | No live data access without approval |
| Sales lead | Sections 1–3 + Section 10 | Discovery call + qualification | Do not promise integrations or exact timelines |
| Implementation partner | Sections 4–5 + Section 12 | Full implementation playbook | Do not set pricing without Cody approval |
| AI agent | Section 8 | Agent operating rules | See Section 8 forbidden actions |
| Investor / grant reviewer | Section 1 + Section 11 + Section 16 | Commercial model + sign-off readiness | No internal pricing without Cody approval |

---

## Section 8 — AI Agent Skill Creation

Full agent specifications are in `DISPATCHTALON_AGENT_SKILL.md`. This section defines the universal rules all agents must follow.

### Universal agent rules

1. Never fabricate test results, feature capabilities, or product behaviour.
2. Never claim browser testing unless a browser was actively used and output was observed.
3. Never expose passwords, tokens, secrets, or credentials in any output.
4. Never hardcode secrets in files, reports, or scripts.
5. Never claim compliance approval, safety certification, or regulatory authorisation.
6. Never claim direct integrations (Xero, MYOB, SMS, ERP) that are not live.
7. Always distinguish current live capability from roadmap intention.
8. Always preserve the dispatcher decision boundary — the dispatcher confirms; DispatchTalon recommends.
9. Always classify assumptions clearly: mark as `assumption`, `unverified`, or `working model`.
10. Always report blockers explicitly and without softening.
11. Always use IF / THEN logic for operational workflows.
12. Always stop and surface an issue rather than proceeding past an ambiguity that could affect correctness.

### Agent roles summary

| Agent | Primary task | Stop condition |
|-------|-------------|----------------|
| Product Audit Agent | Review feature behaviour against documented spec | Any undocumented behaviour or data exposure |
| QA Test Agent | Verify UI flows and data outputs | Cannot verify without browser access; stop and report |
| Sales Qualification Agent | Score leads, recommend tiers | Score below 10 → stop and recommend decline |
| Outreach Agent | Draft outbound messages using approved templates | Banned vocabulary detected → stop and rewrite |
| Implementation Agent | Run tenant setup and worker import | Worker list not received → stop, do not begin |
| Support Agent | Diagnose and fix reported issues | Cannot verify fix without dispatcher confirmation → stop |
| Documentation Agent | Create and update internal documents | Cannot create public pricing or compliance claims |
| Competitive Analysis Agent | Research market positioning | Cannot claim competitor data as verified without source |
| Demo/Recording Agent | Produce safe demo content | Real customer data visible → stop immediately |
| Commercialisation Sign-off Agent | Run sign-off checklist | Any BLOCKED item → stop and report to Cody |

---

## Section 9 — Lead Funnel Architecture

Full system in `DISPATCHTALON_LEAD_FUNNEL_SYSTEM.md`. This section provides the stage map.

### Funnel stage map

| Stage | Goal | Success signal | Failure signal |
|-------|------|---------------|----------------|
| 1. Awareness | Target is aware DispatchTalon exists | Inbound enquiry or engaged outbound reply | No reply after 3 nudges |
| 2. Curiosity | They are asking about the problem | Specific question about allocation / credential / role coverage | "Send me a brochure" without engagement |
| 3. Problem recognition | They articulate the pain in their own words | Verbatim quote about current process pain | "We manage fine" with no exploration |
| 4. Qualification | Lead scored ≥14 | Score ≥14, fit category assigned | Score <10 → decline |
| 5. Discovery call | 30-minute call completed, scored | Score updated post-call, next action set | Decision-maker not on call |
| 6. Pilot fit | Tier matched and proposal sent | Partner reads scope and asks specific questions | Asks for scope outside agreed boundary |
| 7. Design partner agreement | Scope + pricing agreed in writing | Written acknowledgement of scope + price | Asks for price without scope |
| 8. Tenant setup | Tenant live, worker list imported | First login confirmed | Worker list not received → defer |
| 9. Active pilot | Jobs created, allocations run | ≥1 job in system by day 3 | No jobs by week 1 → re-kick |
| 10. Weekly review | Regular feedback cadence | Every scheduled review held | 3 consecutive misses → escalate |
| 11. Exit review | Outcomes measured, decision made | Outcome captured + continuation decision | No data captured → inconclusive |
| 12. Commercial outcome | Conversion or structured exit | Continuation signed or polite exit with data | Neither within 30 days of exit → chase once, then close |

---

### Lead qualification columns and scoring

| Column | Scoring range |
|--------|--------------|
| Pain severity | 1–5 |
| Decision-maker access | 1–5 |
| Feedback willingness | 1–5 |
| Support burden risk | 1–5 (reverse-scored: 5 = low burden) |
| Commercial seriousness | 1–5 |
| **Total** | **/25** |

| Score | Category | Action |
|-------|----------|--------|
| 22–25 | Priority Design Partner | Founding or Commercial Pilot |
| 18–21 | Strong Pilot Candidate | Labour Allocation Pilot (Founding if plant+labour) |
| 14–17 | Testing Partner / Nurture | Testing Partner |
| 10–13 | Low Priority | Defer / nurture |
| <10 | Decline / Park | Decline politely using template B4 |

---

## Section 10 — Sales Architecture

### The commercial wedge

Lead with:
> "A job may need four roles, not four people."

Do not lead with features. The wedge works because it immediately translates to money (fewer people = lower cost or higher margin) and to coordination (fewer people = simpler logistics).

### Opening script

> "We build dispatch decision support for labour and crane teams. The wedge is role coverage — a lot of the teams we work with are over-allocating jobs because nothing in their current process surfaces when one worker can cover two roles. Does that sound familiar?"

Pause and listen. If yes → pursue. If no → ask the three diagnostic questions.

### Three diagnostic questions

1. "Where does a job first land — phone, email, text, WhatsApp?"
2. "How do you know who has the right ticket before you send them?"
3. "Where is the reason for your allocation recorded?"

If all three have clean, systematic answers → DispatchTalon may not be urgent. Ask about growth plans and file.
If any one of those has a rough answer → there is a problem to explore.

### Discovery questions (full list)

| # | Question | What it reveals |
|---|---------|-----------------|
| 1 | Where does the job first land — phone, email, text, OneNote? | Current intake method; how structured it is |
| 2 | What do you use today to manage the job and the worker list? | Current tooling |
| 3 | Who selects the worker for a job — how do they decide? | Decision process |
| 4 | How do you check that a worker has the right ticket? | Credential checking method |
| 5 | Do you have workers who can do more than one role? | Multi-role opportunity |
| 6 | How do you stop a four-role job using four people when it only needs two? | Role-coverage opportunity |
| 7 | How do you avoid sending someone who is too tired? | Fatigue awareness |
| 8 | Where do you record why a specific person was selected? | Audit gap |
| 9 | How do workers find out they're on a job? | Notification method |
| 10 | How does admin get the allocation data for payroll? | Export/retyping pain |
| 11 | What would make a 90-day pilot worth continuing for you? | Commercial intent |
| 12 | Who signs off on the decision to trial new software? | Decision-maker |

### Objection handling

| Objection | Response |
|-----------|---------|
| "We already use OneNote." | "OneNote captures the conversation. DispatchTalon structures the decision. Those are complementary — the question is whether you're recording why the person was selected." |
| "We already use a dispatch system." | "Most dispatch systems fill the slot. DispatchTalon shows the reasoning. Does your current system record what credential was checked and what warning was acknowledged before you pressed go?" |
| "We do not want another app." | "You'd be replacing your current process, not adding to it. The question is whether the current process is creating risk or cost." |
| "Can it integrate with Xero / MYOB?" | "Not directly yet. The Export Centre produces CSVs that your admin imports to your accounting system. For most operators in the pilot, that's two minutes of work and removes the manual retyping." |
| "Does it send SMS?" | "It generates the message. Your dispatcher copies and sends it. That's a deliberate design choice — you stay in control of what goes out to your workers." |
| "Does it replace our dispatcher?" | "No. The dispatcher reviews every recommendation and confirms the allocation. DispatchTalon reduces the mental load; it does not remove the judgement." |
| "How much setup is involved?" | "We do the initial tenant configuration with you. You provide the worker list in any format — spreadsheet is fine. The first live job should be inside a week of kick-off." |
| "Is this compliant?" | "DispatchTalon structures the decision and records the reasoning. Compliance is your company's responsibility. DispatchTalon makes the evidence for your decisions visible." |
| "Can we try it free?" | "We offer a Testing Partner arrangement — limited scope, structured feedback, 14–30 days. It's not free, but the setup cost is minimal and it's designed to give you a real look at the workflow." |
| "We are too busy to test." | "That's the most common signal that the current system is consuming time. How long does your dispatcher currently spend each Monday preparing the week's allocations?" |

---

## Section 11 — Pilot and Pricing Model

**Pricing is an internal working model only. Not public pricing. Not a fixed quote. Subject to scope, support load, and written agreement.**

All prices are in AUD, exclusive of GST.

### Tier 1: Testing Partner

| Attribute | Detail |
|-----------|--------|
| Setup fee | $0 – $1,000 (depending on import complexity) |
| Monthly fee | $0 |
| Duration | 14–30 days |
| Use when | Score 14–17; useful feedback but weak budget; small operator; strategic relationship |
| Workers cap | Up to 15 |
| Jobs cap | Up to 20 over the test window |
| Assets | None required |
| Support | Email / async only; no weekly call |
| Feedback requirement | Minimum 2 structured feedback sessions |
| User cap | Up to 2 named users |
| Does not include | Weekly reviews, custom development, SMS gateway, Xero integration, on-site visits |
| Success metric | Two feedback sessions completed; ≥5 real jobs run; one usable verbatim quote |
| Upgrade trigger | If weekly job volume and pain justify Labour Allocation Pilot |

---

### Tier 2: Labour Allocation Pilot

| Attribute | Detail |
|-----------|--------|
| Setup fee | $2,500 |
| Monthly fee | $1,500 |
| Duration | 90 days |
| Total | $7,000 |
| Use when | Score 18–21; labour-only; up to 50 workers; ≥5 jobs/week |
| Workers cap | Up to 50 |
| Jobs cap | Up to 50/month |
| Assets | None required (labour-only) |
| Support | Email + 1 × weekly/fortnightly review call |
| Feedback requirement | Weekly or fortnightly structured review |
| User cap | Up to 3 named users |
| Does not include | Plant allocation, custom development, SMS gateway, Xero integration |
| Success metric | 50 total jobs run; operational + quality metrics captured; continuation intent recorded |
| Upgrade trigger | If pilot proves ROI and scale warrants Founding or Commercial tier |

---

### Tier 3: Founding Partner Pilot

| Attribute | Detail |
|-----------|--------|
| Setup fee | $5,000 |
| Monthly fee | $2,500 |
| Duration | 90 days |
| Total | $12,500 |
| Use when | Score 22+; labour + plant; up to 100 workers; up to 25 assets; strong feedback potential |
| Workers cap | Up to 100 |
| Jobs cap | Up to 150/month |
| Assets | Up to 25 |
| Support | Email + weekly review call + mid-pilot working session |
| Feedback requirement | Weekly review; mid-pilot (week 6) and exit (week 12) formal sessions |
| User cap | Up to 5 named users |
| Does not include | Custom development, SMS gateway, Xero integration, unlimited support |
| Success metric | 150 total jobs run; 3/5 quality metrics improved; continuation intent recorded; case study potential assessed |
| Upgrade trigger | Full commercial subscription post-pilot |

---

### Tier 4: Commercial Pilot

| Attribute | Detail |
|-----------|--------|
| Setup fee | $10,000 |
| Monthly fee | $5,000 |
| Duration | 90 days |
| Total | $25,000 |
| Use when | Score 22+; formal evaluation; multiple allocators; management-level approval; up to 250 workers / 75 assets |
| Workers cap | Up to 250 |
| Jobs cap | Up to 500/month |
| Assets | Up to 75 |
| Support | Email + weekly review + month-end management report |
| Feedback requirement | Weekly reviews; formal reporting at week 6, 10, and 12 |
| User cap | Up to 10 named users |
| Does not include | Custom development, SMS gateway, Xero integration, on-site training beyond kick-off |
| Success metric | Commercial Pilot outcome report; formal continuation decision; case study with named sign-off |
| Upgrade trigger | Formal commercial subscription + new agreement |

---

### Tier 5: Managed / On-call Support (add-on)

| Attribute | Detail |
|-----------|--------|
| Monthly fee | $8,000 – $10,000 |
| Type | Add-on only — not standalone |
| Attaches to | Founding Partner Pilot or Commercial Pilot |
| Use when | High support expectation; multi-branch; complex data import; weekly optimisation |
| Includes | Cody / Pressure Systems actively involved; weekly optimisation session; data import support; priority response |

---

## Section 12 — Implementation Playbook

Full playbook with IF/THEN fixes is in `DISPATCHTALON_IMPLEMENTATION_PLAYBOOK.md`. This section provides the stage sequence.

### Stage sequence

| Stage | Owner | Done when |
|-------|-------|-----------|
| 1. Lead qualified (score ≥14) | Cody | Score recorded in first-5 or lead sheet |
| 2. Discovery call completed | Cody | Call held, score updated, next action set |
| 3. Pilot tier selected | Cody | Tier agreed verbally with partner |
| 4. Agreement sent | Cody + lawyer | Agreement outline sent with pilot scope |
| 5. Agreement signed | Both parties | Signed copy on file in secure drive |
| 6. Tenant created | Cody | Tenant live on Fly.io, isolated environment |
| 7. Admin user provisioned | Cody | Admin user created, pre-set password issued |
| 8. Password rotation completed | Partner admin | Admin logs in and rotates password |
| 9. Build My Business setup | Cody + partner | Operating mode, caps, notifications configured |
| 10. Worker import | Cody + partner admin | Worker list imported and reviewed |
| 11. Requirement catalogue setup | Cody + ops manager | Role-credential mapping confirmed |
| 12. Assets added | Cody + partner admin | Asset register populated (plant+labour only) |
| 13. First job created | Dispatcher | Real job created in DispatchTalon |
| 14. First SmartRank run | Dispatcher | Allocation run on first job |
| 15. First allocation published | Dispatcher | Allocation confirmed and published |
| 16. Audit checked | Cody + partner | AuditIQ reviewed for first job events |
| 17. Export checked | Partner admin | First CSV export downloaded and reviewed |
| 18. Weekly feedback started | Cody + partner | First weekly review call held |

**Critical: Do not proceed past Stage 5 without a signed agreement. Do not proceed past Stage 10 without a real worker list.**

---

## Section 13 — Support Playbook

Full playbook with symptom/cause/fix/escalation for all 13 categories is in `DISPATCHTALON_IMPLEMENTATION_PLAYBOOK.md`. Core rule:

**Never say "fixed" until verified. Never apply a fix without confirming the symptom first.**

### Support categories quick reference

| Category | Most common cause | First check |
|----------|------------------|-------------|
| Login / password | Pre-set password not rotated | Confirm forced rotation was triggered on first login |
| Tenant setup | Build My Business incomplete | Check operating mode and caps are set |
| Worker import | CSV format mismatch | Review column mapping against import template |
| Worker save | Duplicate credential record | Check for existing credential with same name |
| Job create | Missing role count | Ensure at least one role + count is entered |
| SmartRank | No eligible workers | Check requirement catalogue vs worker credential records |
| CredentialGate | Credential record expiry date wrong | Review worker profile credential dates |
| Role coverage | Workers without multi-role profiles | Review worker role assignments in profiles |
| Publish allocation | Unfilled role slot | Ensure all required roles are assigned before publish |
| Audit | Event missing | Events are triggered automatically — if missing, check database trigger status |
| Exports | Empty CSV | Confirm data exists in the period selected |
| Mobile usability | PWA not installed | Guide partner through "Add to home screen" in browser |
| Data cleanup | Duplicate workers | Use worker deactivation, not hard delete |

---

## Section 14 — Data and Security Rules

These rules apply to all agents, workers, and partners.

### Hard rules

| Rule | Applies to |
|------|-----------|
| No real passwords in any chat, report, or document | Everyone |
| No tokens or API keys in any file that is committed to git | Agents, developers |
| No real customer data in screenshots | Agents, demo producers |
| No real customer data in publicly shared content | Everyone |
| No accidental public pricing from internal working model | Everyone |
| No unapproved case study, quote, or metric | Everyone |
| No public compliance or safety claims | Everyone |
| No hard delete of audit records unless explicitly approved by Cody | Agents, support workers |
| No sharing of tenant credentials outside the agreed user list | Partners, support workers |
| No SMS sent directly from DispatchTalon infrastructure | Engineers, agents |
| No Xero/MYOB API connections in any live environment | Engineers |
| Demo data must be clearly labelled (prefix: TEST) | Agents, support workers |

### Tenant isolation

Each partner's data exists in a separate tenant. No code path permits cross-tenant data access. If a support or implementation action requires accessing a partner's tenant, explicit permission must be recorded before access.

### CSV exports

CSV exports contain real operational data. They must be:

- Shared only with the named partner admin and Cody
- Not attached to any external-facing document
- Not used as marketing evidence without partner written sign-off on specific numbers

---

## Section 15 — Content and Demo System

### Core demo path

```
Dashboard
→ Build My Business (show configured state)
→ Worker list (show multi-role workers with credentials)
→ Job creation (show role counts being entered)
→ SmartRank (show ranked output with CredentialGate flags)
→ Role coverage (show conservative vs minimum headcount)
→ Publish allocation (show dispatcher confirming)
→ AuditIQ (show event record)
→ Export Centre (show CSV download)
```

### Demo content rules

| Rule | Reason |
|------|--------|
| No passwords visible in any recording | Security |
| No terminal or code visible | Positioning — DispatchTalon is an operator tool, not a developer tool |
| No frantic cursor movement | Professionalism |
| No real customer data | Privacy and consent |
| No old LIFTIQ branding | Brand consistency |
| One action per scene | Clarity |
| Zoom only to focus attention on a specific UI element | Clarity, not decoration |
| Pause after every key action | Viewer comprehension |

### Content types

| Type | Duration | Purpose | Primary hook |
|------|----------|---------|-------------|
| 10-second teaser | 10s | Social scroll-stop | "A job may need four roles, not four people." |
| 30-second proof | 30s | Proof of concept | SmartRank + role coverage in action |
| 1-minute social cut | 60s | LinkedIn / X share | Full allocation decision in one minute |
| 3-minute walkthrough | 3min | Sales follow-up | Full demo path with narration |
| Full tutorial | 15–20min | Onboarding | Complete onboarding flow |
| LinkedIn carousel | 6–8 slides | Awareness content | The problem → the wedge → the solution |

### Primary video hook

> "A job may need four roles, not four people."

Every content piece should arrive at this within the first 10 seconds. It is the product's commercial reason in one sentence.

---

## Section 16 — Commercialisation Sign-Off

Full checklist is in `DISPATCHTALON_COMMERCIALISATION_SIGNOFF.md`. Before any public launch, active outbound, or investor review:

### Product readiness (minimum for any external engagement)

- [ ] Login and password rotation stable
- [ ] Clean tenant setup works from scratch
- [ ] Worker/job creation tested
- [ ] SmartRank produces correct output on test data
- [ ] Role coverage surfaces correctly
- [ ] Publish allocation works and generates SMS preview
- [ ] AuditIQ records all expected events
- [ ] Export Centre downloads correct CSVs

### Market readiness

- [ ] Homepage current (DispatchTalon brand, no LIFTIQ references)
- [ ] Design partner pack complete (all 11 files from PR #48)
- [ ] Lead qualification sheet ready (PR #49)
- [ ] Outreach messages ready
- [ ] Discovery call script ready
- [ ] Demo video is safe (no passwords, no real data, no old branding)
- [ ] Pricing confirmed internally by Cody as working model

### Legal / IP readiness

- [ ] DispatchTalon name risk reviewed (attorney consultation planned or complete)
- [ ] Trademark search or attorney review initiated
- [ ] Pilot agreement lawyer-reviewed before first signing
- [ ] IP ownership register started (software, brand, design, models)
- [ ] No public trademark claims made before attorney review

### Operational readiness

- [ ] Support boundaries documented and partner-facing
- [ ] Onboarding process tested end-to-end
- [ ] Password reset process tested
- [ ] Data cleanup process documented
- [ ] Weekly review process confirmed with first partner

### Commercial sign-off

- [ ] First five leads scored (score recorded in first-5 sheet)
- [ ] Top two leads contacted using approved outreach templates
- [ ] First discovery call booked
- [ ] One pilot scope drafted and reviewed
- [ ] Agreement outline lawyer-reviewed

---

## Section 17 — Failure Modes

### The twelve critical failure modes

| # | Risk | Warning sign | Prevention | Response |
|---|------|-------------|-----------|---------|
| 1 | Overbuilding before pilot feedback | Feature development continues without pilot data | Gate all new features behind at least one pilot using the existing feature | Stop development sprint; focus on getting first pilot live |
| 2 | Free pilots consuming support | Testing partner consuming 10+ hours/week | Enforce support-hours cap in Testing Partner scope | Review scope; convert to paid tier or exit |
| 3 | Public claims exceeding product reality | Website or content uses "compliant", "safe", "automated" | Pre-publication review against banned vocabulary list | Remove immediately; issue correction if shared |
| 4 | Pricing shown too early | Price appears in outbound message before scope is agreed | Template compliance — no price before scope template (B1/B2) | Retract; resend scope-first message |
| 5 | Integration requests derailing focus | Partner asks "when will Xero be ready?" in week 2 | Explicit exclusion list in pilot scope; re-read at kick-off | Redirect to Export Centre; record request in backlog |
| 6 | Role coverage misunderstood as compliance approval | Partner says "DispatchTalon says this is compliant" | Section 13 of pilot agreement is non-waivable; reiterate at every review | Correct immediately and in writing; if repeated, trigger hard-stop conditions |
| 7 | SMS publish misunderstood as automatic | Partner expects workers to receive SMS automatically | State clearly at kick-off: "DispatchTalon generates the preview; your dispatcher copies and sends." | Clarify; demonstrate correct workflow |
| 8 | Export Centre misunderstood as accounting integration | Partner expects data to appear in Xero automatically | Explain export-import workflow at onboarding; include in pilot scope exclusions | Show the correct workflow; document the import steps for the admin |
| 9 | Poor password / access setup damaging trust | Partner cannot log in on day one | Forced rotation tested before kick-off; credentials issued in advance | Emergency reset; schedule a same-day re-onboard |
| 10 | No audit of real outcomes | Pilot ends with no metrics captured | Baseline metrics at kick-off; weekly updates; exit review mandatory | Reschedule exit review; do not close pilot without outcome record |
| 11 | Homepage becoming too dense | Every feature is listed; visitors cannot identify the core wedge | Homepage audits against core message: role coverage + decision support | Remove secondary feature copy; reinforce wedge |
| 12 | Founder time diluted across low-quality leads | Cody is spending hours on leads scoring below 14 | Weekly Monday triage; strictly enforce lead score gates | Do not pursue leads below 14 without strategic reason; decline politely using template B4 |

---

## Section 18 — If All Else Is Lost: One-Page Summary

**What DispatchTalon is:**
Dispatch decision support for labour, crane, rigging, plant, transport, and lifting teams. It structures the allocation decision before work is confirmed, shows the reasoning, and keeps an audit trail.

**The one-sentence wedge:**
A job may need four roles, not four people.

**Who it is for:**
Companies with 5–250 workers (best fit 15–40) who allocate using OneNote, spreadsheets, whiteboards, or phone calls. Crane, rigging, labour hire, plant hire, transport, and lifting sectors.

**What it is not:**
Not payroll. Not a compliance tool. Not a scheduler. Not an ERP. Not an autonomous dispatch engine. Does not send SMS. Does not connect to Xero or MYOB.

**The workflow:**
```
Build My Business
→ Import workers (roles + credentials)
→ Create job (roles + counts)
→ Run SmartRank
→ Review role coverage (4 roles ≠ 4 people)
→ Acknowledge warnings (CredentialGate, FatigueGuard)
→ Confirm allocation
→ Publish (generate SMS preview)
→ Audit (AuditIQ records everything)
→ Export (CSV handoff to office)
```

**The commercial path:**
```
Qualify lead (score /25)
→ Run discovery call (12 questions)
→ Match tier (Testing / Labour / Founding / Commercial)
→ Agree scope in writing
→ Sign pilot agreement (lawyer-reviewed)
→ Configure tenant (worker list + requirement catalogue)
→ Run real jobs in the system
→ Collect weekly evidence (operational + quality + commercial metrics)
→ Week 12 exit review
→ Convert to commercial subscription or structured exit
```

**The boundary:**
DispatchTalon surfaces recommendations. The dispatcher confirms. The dispatcher is always the decision-maker. DispatchTalon never dispatches without human confirmation. DispatchTalon never approves, certifies, or guarantees anything.

**The audit:**
Every decision, override, warning acknowledgement, and publish event is recorded in AuditIQ. This is the evidence that supports the dispatcher's professional judgement. It is not a compliance certificate.

**The pricing (internal working model):**
Testing: $0–$1k / Labour: $7k / Founding: $12.5k / Commercial: $25k.
Not public pricing. Subject to scope and written agreement.

**Immediate next action:**
1. Put five real operator names in the first-5 lead qualification sheet.
2. Score from public knowledge.
3. Book the first discovery call for the highest-scoring lead.
4. Use `design-partner-discovery-call-script.md` for the call.
5. Do not send pricing before scope is agreed.

---

*DispatchTalon exists because the dispatch decision is not a scheduling problem — it is a reasoning problem under constraint. The goal is to externalise the reasoning, make it auditable, and give the dispatcher confidence that the right checks happened before the right person was sent to the right job.*
