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

# DispatchTalon Master Operating Doctrine

## 1. Executive Doctrine

DispatchTalon is dispatch intelligence for labour and lifting operations.

DispatchTalon structures the dispatch decision before work is confirmed. It helps labour, crane, rigging, plant, transport, and lifting teams turn rough job details, worker roles, credentials, schedules, plant context, role coverage, allocation decisions, publish steps, audit events, and CSV office handoff into one controlled workflow.

DispatchTalon is not a generic scheduling tool. It is not payroll software. It is not invoicing software. It is not accounting software. It is not a compliance approval system. It is not a permit approval system. It is not lift-engineering software. It is not an autonomous dispatch engine.

DispatchTalon is a decision-support layer for dispatch allocation. The dispatcher remains the decision-maker.

It helps answer:

- What does the job require?
- Who can realistically cover the required roles?
- What credentials are required?
- What schedule, fatigue, or availability warnings exist?
- What plant, asset, or transport context needs review?
- What should be reviewed before dispatch?
- What was selected?
- Why was it selected?
- What was published to the worker?
- What is recorded in the audit trail?

The commercial wedge is simple: a job may need four roles, not four people.

The secondary wedge is operational: DispatchTalon allocates role coverage, not just names on a roster.

## 2. Core Beliefs

| Belief | Meaning | Product behaviour | Do not do |
|---|---|---|---|
| Dispatch is a decision, not just a schedule. | The schedule is the output of judgement, not the judgement itself. | Job requirements, warnings, allocations, and audit records sit around the dispatch action. | Do not reduce DispatchTalon to calendar software. |
| A job may require several roles without requiring several people. | Multi-skilled crews can cover compatible role sets when credentials and job context allow it. | Role coverage compares conservative headcount with suggested minimum headcount. | Do not silently collapse roles or imply approval. |
| Good dispatchers already think in role coverage. | The product should model real operator thinking. | Required role counts, separate-worker-only flags, compatibility warnings, and review reasons are visible. | Do not force every role to become a separate person by default. |
| The system should reduce mental load, not remove judgement. | DispatchTalon organises the decision so a human can review it. | SmartRank, CredentialGate, FatigueGuard, and role coverage provide explainable decision support. | Do not claim autonomous dispatch. |
| The dispatcher remains accountable for the final decision. | The system does not approve site, client, legal, or company suitability. | Publish allocation and override flows require deliberate action. | Do not say the software makes the decision. |
| Audit trails protect memory, handover, and review. | Decisions should survive shift changes and later review. | Audit events record job creation, SmartRank, warnings, role coverage, allocation, publish preview, and manual publish events. | Do not edit or hide audit records to make a story cleaner. |
| Clean setup creates trust. | Fake defaults and demo residue undermine credibility. | Build My Business starts with company operating mode, requirements, workers, assets where needed, and timezone. | Do not seed real tenants with fake workers, jobs, or assets. |
| Wrong input creates wrong allocation. | The product can only reason from the data supplied. | Job Brief Import and worker import still require review. | Do not treat imported text as confirmed truth. |
| Export-first beats premature integration. | CSV handoff creates value without carrying payroll or accounting liability. | Export Centre provides workers, jobs, allocations, payroll-prep, invoice-prep, audit, and metrics CSVs. | Do not claim Xero or MYOB integration. |
| Manual publish beats accidental notification. | Worker communication should be deliberate. | SMS preview, copy, and manual publish are controlled and audited. | Do not imply automatic SMS sending is live. |
| A pilot must prove behaviour, not just features. | The question is whether DispatchTalon improves real dispatch workflow. | Weekly review should track real jobs, warnings, overrides, exports, and decision quality. | Do not treat setup completion as proof of commercial fit. |
| The product should earn trust before asking for deep integration. | Data exports and manual workflows should prove value before API integration. | Current handoff is CSV-first and office-review-led. | Do not build or sell deep integrations before the workflow is proven. |

## 3. Market Problem

Many small-to-mid labour, crane, rigging, plant, transport, and lifting operators currently run dispatch through a mix of OneNote, spreadsheets, whiteboards, SMS, WhatsApp, phone calls, memory, generic job systems, large expensive dispatch systems, and ERP tools that do not explain the allocation decision clearly.

Common problems:

- Rough notes become unclear jobs.
- Worker skills live in someone's head.
- Tickets, credentials, and VOCs are checked manually.
- Multi-skilled workers are underused.
- Jobs are over-allocated because each role is treated as a separate person.
- Jobs are under-allocated because role overlap is assumed without review.
- Plant numbers and workers are tracked separately.
- Allocation reasons are not recorded.
- Worker notification happens informally.
- Office and admin staff retype job and allocation data later.
- Management cannot see why decisions happened.

OneNote captures the conversation. DispatchTalon structures the decision.

## 4. Product Capability Map

| Capability | What it does | Why it matters | What it does not claim |
|---|---|---|---|
| Build My Business | Guides first-run setup around operating mode, catalogue, workers, assets, and timezone. | Creates trust by starting with the actual business. | Does not create fake defaults. |
| Labour-only mode | Hides plant-heavy workflow where the company only allocates people. | Reduces clutter for labour suppliers. | Does not turn DispatchTalon into HR software. |
| Plant + labour mode | Adds equipment classes, asset register, plant numbers, crane context, and transport review flags. | Supports companies allocating people and equipment. | Does not replace fleet management or lift engineering. |
| Company requirement catalogue | Lets each company choose credentials, equipment, transport, civil, rail, energy, and VOC items. | Avoids irrelevant requirements. | Does not certify the catalogue as legal advice. |
| Worker import | Imports workers from CSV or pasted spreadsheet data. | Speeds setup and supports office data migration. | Does not validate real-world employment or licence legality. |
| Worker profile management | Maintains roles, credentials, VOCs, fatigue records, preferences, and archive status. | Gives SmartRank and CredentialGate useful inputs. | Does not guarantee worker suitability. |
| Job creation | Creates structured jobs manually. | Converts dispatch intent into reviewable requirements. | Does not auto-approve jobs. |
| Job Brief Import | Converts pasted text, `.txt`, or `.md` briefs into reviewed job drafts. | Reduces retyping from rough notes. | Does not create confirmed jobs without dispatcher review. |
| Role counts | Captures how many slots each required role needs. | Prevents a single role selection from hiding headcount reality. | Does not decide the crew automatically. |
| Separate-worker-only | Marks role requirements that should not be combined. | Protects required separation where the job context demands it. | Does not replace company procedure review. |
| Correct credential taxonomy | Keeps High Risk Work and non-HRW categories separated. | Protects credibility with industrial operators. | Does not provide legal credential advice. |
| SmartRank | Ranks workers with explainable fit signals. | Helps dispatchers review stronger options first. | Does not replace dispatcher judgement. |
| CredentialGate | Surfaces credential hard blocks and warnings. | Reduces missed credential checks. | Does not certify compliance. |
| FatigueGuard | Surfaces fatigue warnings and hard blocks from available records. | Supports pre-dispatch review. | Does not guarantee safety or incident prevention. |
| Schedule conflict awareness | Checks overlapping allocations and schedule windows. | Reduces double-booking risk. | Does not replace operational confirmation. |
| Multi-role allocation coverage | Suggests how one worker may cover multiple compatible roles. | Reduces unnecessary over-allocation while preserving review. | Does not approve role combinations. |
| Conservative vs suggested headcount | Shows role slots beside suggested worker count. | Makes headcount logic visible. | Does not force minimum staffing. |
| Review warnings | Flags review-required, discouraged, or unusual combinations. | Keeps the dispatcher aware of decision risk. | Does not use legal terms such as safe, compliant, approved, or legal. |
| Allocation override reasons | Records why a warning or non-top-ranked selection was accepted. | Preserves decision reasoning. | Does not remove the need for review. |
| Publish allocation | Lets the dispatcher deliberately publish after allocation. | Prevents accidental worker notification. | Does not auto-send SMS. |
| SMS preview / copy / manual publish | Generates operational text for manual copy and records manual publish status. | Gives controlled communication proof without provider dependency. | Does not claim direct SMS sending is live. |
| Audit events | Records key workflow actions and decisions. | Supports handover, review, and pilot evidence. | Does not create legal protection by itself. |
| Metrics | Summarises activity counts and workflow signals. | Supports pilot review. | Does not prove ROI alone. |
| Export Centre | Provides CSV office handoff exports. | Reduces retyping and supports admin review. | Does not integrate with accounting systems. |
| Asset register | Tracks actual plant numbers under equipment classes. | Helps dispatchers separate class needs from actual assets. | Does not become full fleet maintenance. |
| Crane/counterweight/transport review context | Shows review flags for crane model, counterweight, support transport, and road-access prompts. | Helps surface review points before dispatch. | Does not approve permits, legal road access, or lift engineering. |
| Tenant isolation | Scopes users, workers, jobs, exports, and audit events by company. | Protects multi-company pilot data. | Does not remove the need for careful access provisioning. |
| Forced password rotation | Requires temporary passwords to be changed. | Reduces credential risk. | Does not solve poor password handling outside the system. |

## 5. Decision-Layer Architecture

| Layer | Input | Logic | Output | Risk if wrong | Human review requirement | Audit implication |
|---|---|---|---|---|---|---|
| Operating mode | Company setup | Labour-only or plant + labour | Visible workflow shape | Wrong screens and requirements | Founder or admin confirms | Setup events |
| Build My Business | Company profile and catalogue | Guided setup tasks | Clean workspace | Demo residue or irrelevant requirements | Admin confirms | Setup state |
| Requirement catalogue | Company-selected requirements | Enabled items only | Valid job options | Wrong credential categories | Admin review | Catalogue update event |
| Worker role matching | Worker roles and job roles | Match role keys | Eligible role coverage | Wrong worker pool | Dispatcher review | SmartRank event |
| CredentialGate | Worker credentials and job requirements | Normalize and compare | Blocks or warnings | Missed credential issue | Dispatcher review | Blocks/warnings can feed audit |
| FatigueGuard | Fatigue records and job window | Rest and workload checks | Blocks or warnings | Overlooked fatigue risk | Dispatcher review | Warning/block event |
| Schedule conflict detection | Allocations and job windows | Time overlap check | Hard block or warning | Double booking | Dispatcher review | Allocation rejection or warning |
| SmartRank | Worker, job, credential, fatigue, schedule, preference data | Deterministic scoring | Ranked workers and blocked workers | Misleading ranking | Dispatcher decides | SmartRank generated |
| Multi-role coverage | Required roles, counts, worker roles, credentials | Build possible coverage sets | Coverage per worker | Over- or under-allocation | Dispatcher confirms | Role coverage suggested |
| Role compatibility review | Coverage combinations and compatibility rules | Compatible, review-required, discouraged, disallowed | Warning or block | Silent unsuitable combination | Review reason where needed | Review/override events |
| Conservative vs suggested headcount | Role slots and coverage assignments | Compare slots to worker assignments | Headcount view | Hidden staffing assumptions | Dispatcher confirms | SmartRank payload |
| Asset / plant selection | Equipment class and company assets | Match class to plant numbers | Selected asset context | Wrong asset assumption | Dispatcher confirms | Asset assignment event |
| Crane / transport review | Crane model and transport fields | Flag review points | Review prompts | False approval impression | Dispatcher confirms with procedure | Review event |
| Publish allocation | Confirmed allocation | Preview and manual publish | Published manual status | Accidental notification | Dispatcher deliberately publishes | Preview and publish events |
| Export handoff | Company-scoped data | CSV build and sanitisation | Office handoff file | Data leak or false accounting claim | Office review | Export activity where recorded |

Key role-coverage example:

| Job requirement | Conservative role slots | Suggested coverage |
|---|---:|---|
| Truck Driver x2 | 2 | Worker 1 covers Truck Driver + Dogman. |
| Dogman x1 | 1 | Worker 2 covers Truck Driver + Rigger. |
| Rigger x1 | 1 | Minimum headcount can be 2, not 4. |

Boundary: DispatchTalon suggests coverage. The dispatcher confirms whether it is suitable for the job, site, client, company procedure, and applicable requirements.

## 6. Role Coverage Doctrine

| Term | Definition |
|---|---|
| Required role | A role the job requires, such as Dogman, Rigger, Truck Driver, Lift Supervisor, Electrical Spotter, EWP Operator, or Crane Operator. |
| Worker role | A role a worker can perform based on profile, credentials, and company knowledge. |
| Role coverage | One worker being assigned to cover one or more required job roles. |
| Role count | The number of slots required for a role. |
| Distinct worker requirement | A rule that a role slot must not be combined with another role for the same worker. |
| Compatible combination | A role pair that may be covered by one worker if credentials and context allow. |
| Review-required combination | A role pair that needs dispatcher review before acceptance. |
| Discouraged combination | A high-review pair that should not be silently collapsed. |
| Disallowed combination | A pair blocked by rule or company policy. |
| Override reason | The dispatcher explanation recorded when proceeding through warnings. |

Role combination guidance:

| Combination | Product behaviour | Warning language |
|---|---|---|
| Dogman + Rigger | Can be suggested if worker has role and credential coverage. | Review role coverage before dispatch. |
| Dogman + Truck Driver | Can reduce headcount where timing and credentials allow. | Confirm site and job suitability for combined duties. |
| Rigger + Truck Driver | Can be suggested where coverage is realistic. | Confirm duties do not conflict. |
| Dogman + Electrical Spotter | Review required if credentialed. | Confirm company/site/client procedure before combining spotter and dogging duties. |
| Rigger + EWP Operator | Can be suggested if credentialed. | Confirm timing and role fit before dispatch. |
| Lift Supervisor + Rigger | Review required. | Supervisor combined with trade role: confirm suitability. |
| Crane Operator + Dogman | Discouraged/review warning. | Crane operator combined with another active lift role requires strong review. |

Do not say: safe, compliant, approved, legal.

Use: review required, confirm suitability, company/site/client procedure should be checked, dispatcher confirmation required.

## 7. User Types and Training Paths

| User type | First understanding | Must learn | Should not touch | Success checklist | Failure risk |
|---|---|---|---|---|---|
| New dispatcher | DispatchTalon structures the decision before dispatch. | Build My Business, workers, jobs, SmartRank, role coverage, publish, audit. | Tenant setup or pricing. | Can create a job, run SmartRank, confirm coverage, publish manually, and read audit. | Treating SmartRank as automatic approval. |
| Operations manager | The system creates operational review and evidence. | Metrics, audit, export, weekly review. | Legal claims or deep integrations. | Can review warnings, overrides, exports, and pilot signals. | Measuring only feature use, not workflow quality. |
| Company owner | DispatchTalon is pilot-stage decision support. | Commercial fit, implementation scope, support load, boundaries. | Product claims outside current capability. | Can decide whether a pilot is worth continuing. | Overcommitting without proof. |
| Admin / office user | Export Centre supports office handoff. | Worker import, CSV exports, audit, data hygiene. | SmartRank overrides unless trained. | Can download clean exports and review before entry elsewhere. | Treating payroll-prep as payroll calculation. |
| Support worker | Never say fixed until verified. | Login, tenant setup, imports, job create, SmartRank, role coverage, publish, exports. | Real passwords, tokens, real customer data in reports. | Can triage, reproduce, fix, and verify. | Guessing causes trust damage. |
| Sales lead | Sell the problem and wedge, not a feature list. | Qualification, discovery, objections, boundaries, next step. | Public pricing promises or compliance claims. | Can qualify pain and recommend a pilot tier internally. | Attracting weak leads. |
| Implementation partner | Clean setup before workflow proof. | Tenant setup, Build My Business, imports, first job, first SmartRank, exports. | Product code or legal terms. | First allocation and export verified. | Bad data setup ruins pilot trust. |
| AI agent | Verify current repo/live state before claims. | Current product truth, proof rules, boundaries. | Fabricated tests, stale LIFTIQ assumptions, secrets. | Outputs verified facts and blockers clearly. | Invented certainty. |
| Investor / grant reviewer | DispatchTalon is a contained pilot-stage operating system. | Market pain, workflow proof, role coverage, audit, export-first. | Legal or compliance reliance. | Understands category, wedge, evidence plan, and risks. | Confusing pilot value with mature enterprise readiness. |

## 8. Current Risks

- Pilot login/password friction can damage trust.
- DispatchTalon name still requires proper legal screening.
- Pricing remains internal working model only.
- SMS provider send is not live.
- Xero/MYOB integration is not live.
- Public route still uses `/liftiq/`.
- Live pilot support burden must be controlled.
- Weak leads can consume founder time.
- Screenshots and recordings must not expose real customer data.
- Role coverage must not be misunderstood as approval or compliance.

## 9. Update Rule

Update this doctrine when any of these change:

- Worker model, worker import, worker archive, or worker credentials.
- Job model, Job Brief Import, role counts, or requirement catalogue.
- SmartRank, CredentialGate, FatigueGuard, schedule conflict logic, or role coverage.
- Allocation confirmation, publish allocation, SMS provider handling, or audit events.
- Export Centre or CSV schemas.
- Tenant setup, auth, password rotation, security, or multi-company access.
- Public homepage, sales assets, pricing, design-partner terms, or claim boundaries.

If product behaviour changes and the doctrine does not, the doctrine becomes stale and must not be treated as current operating truth.

## 10. If All Else Is Lost

If every other doc in this set is missing, this is the recovery summary.

- The product is **DispatchTalon**. The legacy route is `/liftiq/`. Do not rebrand back.
- The product is **decision-support**, not compliance, not payroll, not engineering authority.
- The unit of value is **a defensible allocation in under two minutes**.
- The decision stack is **Eligibility, Availability, Fatigue, Fit, Coverage, Operator, Publish, Audit**.
- The **operator is always the decision-maker**. The system never publishes alone.
- The customer focus is **the first five design-partner pilots**. Their feedback outranks aesthetics.
- The **claim boundary is sacred**. We never claim to make a worker compliant, safe, or licensed.
- The **audit log is the system of record**. Not memory, not chat, not spreadsheets.
- The strongest wedge is **role coverage**: a job may need four roles, not four people.
- The product workflow is: Build business, Add workers, Create jobs, Run SmartRank, Review role coverage, Publish allocation manually when ready, Check audit, Export CSV office handoff.
- The commercial path is: Qualify leads, Run discovery, Match internal pilot tier, Sign pilot agreement, Configure tenant, Run real jobs, Collect evidence, Convert or exit.
- Internal docs live under `docs/`. Companion docs are listed in each file header.

Rebuild from here.
