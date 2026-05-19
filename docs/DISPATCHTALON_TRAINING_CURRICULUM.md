INTERNAL ONLY — NOT FOR PUBLIC DISTRIBUTION

Product:
DispatchTalon by Pressure Systems

Status:
Internal operating doctrine

Use:
For DispatchTalon workers, agents, implementation partners, sales operators, support operators, and founder-led commercialisation.

Public use:
Not approved.

Pricing:
Internal working model only.

Legal:
Not legal advice. Not compliance advice. Not engineering advice.

Current route note:
The public product route may still use `/liftiq/` for legacy stability, but the current product brand is DispatchTalon.

Owner:
Pressure Systems

Last reviewed:
2026-05-19

Update trigger:
Review after any PR changing workers, jobs, SmartRank, CredentialGate, FatigueGuard, role coverage, publish allocation, SMS provider handling, exports, public homepage, pricing, design-partner terms, tenant setup, auth, or security.

# DispatchTalon Training Curriculum

## 1. Training Purpose

This curriculum trains humans and AI agents to understand DispatchTalon as pilot-stage dispatch intelligence for labour and lifting operations.

The primary training outcome is operational clarity:

- Understand the product boundary.
- Set up clean tenants.
- Import workers.
- Create or import jobs.
- Run SmartRank.
- Review role coverage.
- Publish allocation manually when ready.
- Read audit and metrics.
- Export CSV office handoff data.
- Avoid unsupported claims.

## 2. Core Training Modules

| Module | Objective | Practical exercise | Pass standard | Failure risk |
|---|---|---|---|---|
| Product doctrine | Explain what DispatchTalon is and is not. | State the product in one minute using approved terms. | Uses decision support, role coverage, audit, export-first, and dispatcher boundary. | Calling it autonomous dispatch or payroll software. |
| Market pain | Explain why OneNote, spreadsheets, texts, and memory are not enough. | Map a rough job note into structured decisions. | Identifies unclear requirements, hidden worker fit, credential checks, and audit gaps. | Selling features before pain is understood. |
| Build My Business | Set up operating mode, timezone, requirements, and assets where needed. | Configure a clean demo tenant. | No default workers, jobs, or fake assets. | Trust loss from bad setup. |
| Worker import | Import workers and validate roles/credentials. | Import a synthetic worker CSV and open a worker profile. | Roles and credentials map correctly; errors are understood. | Bad headers or unsupported roles causing import failure. |
| Job creation/import | Create manual jobs and import rough job briefs. | Create one manual job and one imported job. | Required roles, counts, credentials, schedule, and notes are reviewed. | Treating parsed text as confirmed truth. |
| SmartRank | Run and interpret ranked and blocked workers. | Run SmartRank for a credential-heavy job. | Can explain score, blocks, warnings, and next review action. | Treating rank as automatic approval. |
| Role coverage | Understand conservative headcount versus suggested minimum headcount. | Use a job requiring Truck Driver x2, Dogman x1, Rigger x1. | Can explain how 4 role slots may become 2 workers with review. | Over- or under-allocation from unreviewed combinations. |
| Publish allocation | Preview, copy, and mark manual publish. | Publish a test allocation without sending external SMS. | SMS preview is operational only; manual publish creates audit record. | Accidental notification or false SMS claim. |
| Audit/metrics | Read the decision trail and pilot evidence. | Find SmartRank, role coverage, allocation, and publish events. | Can identify why a decision happened. | Missing review trail. |
| Export Centre | Download and review CSV handoff exports. | Export workers, jobs, allocations, payroll-prep, invoice-prep, audit, metrics. | Understands CSV office handoff and no payroll/invoice calculation. | Calling exports accounting integration. |
| Sales qualification | Qualify pilot fit and support burden. | Score a synthetic lead. | Uses lead criteria and internal tier logic without public pricing. | Wasting founder time on weak leads. |
| Support QA | Triage issues without guessing. | Diagnose an import, login, or SmartRank issue. | Reports symptom, likely cause, first check, fix, and verification. | Saying fixed before verification. |

## 3. Learning Paths

### 3.1 New Dispatcher

| Field | Detail |
|---|---|
| Learning objective | Use DispatchTalon to structure dispatch decisions before work is confirmed. |
| Sequence of modules | Product doctrine, Build My Business overview, worker profile, job creation/import, SmartRank, role coverage, publish allocation, audit. |
| Practical exercise | Create a job requiring Dogman x1 and Truck Driver x1, allocate a worker who can cover both, record review reason if required, and publish manually. |
| Pass standard | Dispatcher can explain why the worker was selected and where the decision was recorded. |
| Failure risk | Treating SmartRank or role coverage as automatic permission to dispatch. |

### 3.2 Operations Manager

| Field | Detail |
|---|---|
| Learning objective | Review whether DispatchTalon improves operational handover and allocation evidence. |
| Sequence of modules | Product doctrine, market pain, metrics, audit, role coverage, exports, weekly review. |
| Practical exercise | Review one week of synthetic allocations and identify warnings, overrides, publish events, and exports. |
| Pass standard | Can identify what worked, what caused friction, and what needs follow-up. |
| Failure risk | Measuring the pilot by logins only instead of decision quality. |

### 3.3 Company Owner

| Field | Detail |
|---|---|
| Learning objective | Decide whether DispatchTalon is commercially useful for the operation. |
| Sequence of modules | Product doctrine, market pain, role coverage, pilot success measures, claim boundaries, support load. |
| Practical exercise | Compare current dispatch method against DispatchTalon workflow for one real job type. |
| Pass standard | Can state the business case, boundary, support need, and continuation decision. |
| Failure risk | Expecting mature enterprise integration before pilot proof. |

### 3.4 Admin / Office User

| Field | Detail |
|---|---|
| Learning objective | Maintain clean data and use exports for office handoff. |
| Sequence of modules | Worker import, job data review, Export Centre, audit, data hygiene. |
| Practical exercise | Import workers, download CSV exports, and check that payroll-prep and invoice-prep exports are review data only. |
| Pass standard | Can open exports safely and explain what they do not calculate. |
| Failure risk | Treating payroll-prep as payroll calculation or invoice-prep as invoicing. |

### 3.5 DispatchTalon Support Worker

| Field | Detail |
|---|---|
| Learning objective | Triage, fix, and verify pilot issues without exposing data or guessing. |
| Sequence of modules | Product doctrine, auth, tenant isolation, imports, job create, SmartRank, role coverage, publish, audit, exports. |
| Practical exercise | Reproduce a worker import mapping error and resolve it with corrected headers. |
| Pass standard | Reports issue, cause, fix, and verification evidence. |
| Failure risk | Saying fixed before verifying or exposing credentials. |

### 3.6 Sales Lead

| Field | Detail |
|---|---|
| Learning objective | Qualify leads around dispatch pain and role coverage without overpromising. |
| Sequence of modules | Market pain, product doctrine, lead funnel, discovery questions, objections, pilot boundaries. |
| Practical exercise | Run a mock discovery call and score the lead. |
| Pass standard | Recommends next action and internal tier without public pricing promises. |
| Failure risk | Attracting low-quality leads by selling broad automation. |

### 3.7 Implementation Partner

| Field | Detail |
|---|---|
| Learning objective | Move a qualified pilot from agreement to first verified workflow. |
| Sequence of modules | Implementation playbook, tenant setup, Build My Business, import, first job, first SmartRank, first publish, audit, export. |
| Practical exercise | Configure a clean synthetic tenant through first allocation and export. |
| Pass standard | Completes setup with no fake production data and verifies every step. |
| Failure risk | Bad initial data damaging trust. |

### 3.8 AI Agent

| Field | Detail |
|---|---|
| Learning objective | Operate inside DispatchTalon without stale assumptions or fabricated proof. |
| Sequence of modules | Agent skill, current reality snapshot, claim boundaries, repo discipline, live proof rules. |
| Practical exercise | Produce a current-state report separating static/code inspection from live API and browser proof. |
| Pass standard | No fabricated tests, no stale LIFTIQ framing, no secrets, no unsupported claims. |
| Failure risk | Invented certainty causing release or commercial errors. |

### 3.9 Investor / Grant Reviewer

| Field | Detail |
|---|---|
| Learning objective | Understand the product category, commercial wedge, pilot state, and risk controls. |
| Sequence of modules | Executive doctrine, market problem, decision layers, role coverage, audit, exports, commercialisation sign-off. |
| Practical exercise | Review the role coverage example and pilot readiness checklist. |
| Pass standard | Can explain why DispatchTalon is commercially useful now while still pilot-stage. |
| Failure risk | Confusing decision support with compliance or legal approval. |

## 4. Training Sequence for New Internal Operators

1. Read `DISPATCHTALON_MASTER_OPERATING_DOCTRINE.md`.
2. Read this curriculum.
3. Complete the product doctrine exercise.
4. Watch or perform the demo path using synthetic data only.
5. Complete one role coverage exercise.
6. Complete one publish allocation exercise without sending external SMS.
7. Download one export set and explain the boundaries.
8. Read `DISPATCHTALON_AGENT_SKILL.md` if acting as an AI or implementation agent.
9. Read `DISPATCHTALON_COMMERCIALISATION_SIGNOFF.md` before outreach or pilot expansion.

## 5. Certification Standard

An internal operator is considered trained only when they can:

- Explain DispatchTalon without using unsupported claims.
- Distinguish role coverage from compliance approval.
- Set up or explain Build My Business.
- Import or validate workers.
- Create or import a job.
- Run SmartRank and interpret CredentialGate/FatigueGuard output.
- Explain conservative headcount versus suggested minimum headcount.
- Publish allocation manually and locate the audit record.
- Export CSV office handoff data and explain boundaries.
- State when to escalate instead of guessing.
