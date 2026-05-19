# DispatchTalon Training Curriculum

**Status:** Internal operating reference | May 2026
**Owner:** Pressure Systems
**Classification:** Internal — not for public distribution
**Companion to:** `DISPATCHTALON_MASTER_OPERATING_DOCTRINE.md`

---

## How to use this document

This curriculum defines complete learning paths for nine user types. Each path is:

- **Sequenced:** start at step 1, not wherever feels right
- **Scoped:** know what the user must not touch as well as what they must learn
- **Verifiable:** a success checklist closes each path so the learner knows when they are ready
- **Failure-aware:** each path names the most likely training failure and how to prevent it

For new users: complete the path fully before operating the product or representing it externally.

For AI agents: Section 9 is the governing path. Section 8 of the Master Doctrine is the constitutional layer.

---

## Path 1: New Dispatcher

**Goal:** Can run a complete allocation cycle — from job creation to published allocation and audit check — without coaching.

### Priority reading (in order)

1. `DISPATCHTALON_MASTER_OPERATING_DOCTRINE.md` — Sections 1, 4, 5, 6
2. `docs/dispatchtalon-role-coverage-examples.md`
3. `docs/dispatchtalon-sms-allocation-notification-architecture.md`
4. `docs/dispatchtalon-export-architecture.md`

### Must learn

| Step | Task | Verified by |
|------|------|-------------|
| 1 | Understand Build My Business setup | Can explain operating mode and why caps matter |
| 2 | Add a worker with multiple roles and credentials | Worker appears correctly in SmartRank |
| 3 | Create a job with role counts | Job shows correct role requirements |
| 4 | Run SmartRank and understand the ranked output | Can identify a CredentialGate block and explain it |
| 5 | Review multi-role coverage options | Can identify the minimum headcount suggestion and decide whether to use it |
| 6 | Acknowledge warnings with a recorded reason | Override appears correctly in AuditIQ |
| 7 | Publish the allocation | Published event appears in AuditIQ; SMS preview text is visible |
| 8 | Check the AuditIQ log | Can find the allocation event and all associated events |
| 9 | Export the allocation data | CSV contains the correct workers and jobs |

### Must not touch

- AuditIQ entries (read-only for dispatchers)
- Worker credential records (updating credential data is an admin function)
- Tenant configuration (Build My Business is an admin function)

### Success checklist

- [ ] Created one real job with at least two role requirements
- [ ] Ran SmartRank and reviewed the ranked output
- [ ] Identified and acknowledged at least one CredentialGate or FatigueGuard condition
- [ ] Published the allocation correctly
- [ ] Confirmed the AuditIQ record contains the expected events
- [ ] Downloaded at least one CSV export and confirmed the data

### Failure risk

Dispatcher publishes allocations based on SmartRank output without reading the warnings. Prevention: require the dispatcher to verbally describe each warning they acknowledged in the first three allocations.

---

## Path 2: Operations Manager

**Goal:** Can review pilot health, understand the audit record, run weekly reviews, and make decisions about allocation process changes.

### Priority reading

1. `DISPATCHTALON_MASTER_OPERATING_DOCTRINE.md` — Sections 1, 2, 5, 6
2. `docs/DISPATCHTALON_IMPLEMENTATION_PLAYBOOK.md` — Part 3 (Pilot Health Check Schedule)
3. `sales/dispatchtalon-design-partner-pack/design-partner-success-metrics.md`
4. `sales/dispatchtalon-design-partner-pack/design-partner-feedback-framework.md`

### Must learn

| Step | Task | Verified by |
|------|------|-------------|
| 1 | Understand the product positioning and boundaries | Can explain the difference between decision support and compliance approval |
| 2 | Understand SmartRank factors | Can explain what each factor means and why it matters |
| 3 | Review the AuditIQ log for a completed allocation | Can identify override events and their reasons |
| 4 | Review the Metrics dashboard | Can identify which metrics are at target and which are lagging |
| 5 | Run a weekly review using the feedback framework | Feedback captured in the framework format |
| 6 | Understand the pilot success bands | Can classify a pilot week as Strong / Workable / Inconclusive / Failed |
| 7 | Export and review Metrics CSV | CSV contains expected data for the review period |

### Must not touch

- Do not delete allocation records
- Do not change live worker credentials without discussion with the dispatcher first
- Do not modify AuditIQ entries

### Success checklist

- [ ] Completed one full weekly review using the feedback framework
- [ ] Reviewed the AuditIQ log for at least three allocations
- [ ] Identified at least one metric that has moved since baseline
- [ ] Can describe which pilot health check is next and what it requires

### Failure risk

Operations manager receives a weekly Metrics CSV but does not review it, meaning metric drift goes unnoticed until week 10. Prevention: schedule 30-minute metric review into every weekly review agenda.

---

## Path 3: Company Owner

**Goal:** Understands the product well enough to evaluate whether a pilot is worth continuing and to approve the commercial decision.

### Priority reading

1. `DISPATCHTALON_MASTER_OPERATING_DOCTRINE.md` — Sections 1, 11, 16, 18
2. `sales/dispatchtalon-design-partner-pack/design-partner-success-metrics.md` — "Commercial metrics" and "Pilot success bands"
3. `docs/DISPATCHTALON_COMMERCIALISATION_SIGNOFF.md`

### Must learn

| Step | Task | Verified by |
|------|------|-------------|
| 1 | Understand what DispatchTalon is and is not | Can recite the "is not" list from memory (no payroll, no Xero, no compliance approval) |
| 2 | Understand the pilot commercial metrics | Can state the three things that determine whether a pilot is "Strong" |
| 3 | Understand the pricing model at the relevant tier | Can describe setup fee, monthly fee, and term for the tier their company is on |
| 4 | Understand the continuation decision criteria | Can identify what "good" looks like at week 12 for their tier |
| 5 | Understand the hard-stop conditions | Can name three conditions that would terminate the pilot immediately |

### Must not touch

- Day-to-day allocation (owner is a reviewer, not a dispatcher)
- Live credential data (unless they are also the admin)

### Success checklist

- [ ] Has read the pilot agreement and understands their obligations (feedback, data supply, review attendance)
- [ ] Understands the distinction between DispatchTalon's role and the dispatcher's role
- [ ] Has confirmed: this pilot is a test of whether DispatchTalon changes our allocation behaviour, not just a feature demo

### Failure risk

Owner signs the agreement without understanding the feedback obligation or the exclusion list. Prevention: walk through the exclusion list and feedback obligation explicitly at the scope agreement stage before the agreement is sent.

---

## Path 4: Admin / Office User

**Goal:** Can import workers, manage the worker register, run CSV exports, and import exports into office systems.

### Priority reading

1. `DISPATCHTALON_MASTER_OPERATING_DOCTRINE.md` — Section 4.5–4.10, 4.26–4.33
2. `docs/dispatchtalon-export-architecture.md`
3. `docs/dispatchtalon-office-admin-export-guide.md`

### Must learn

| Step | Task | Verified by |
|------|------|-------------|
| 1 | Import a worker list from CSV | All workers appear in the worker register with correct roles and credentials |
| 2 | Add a new worker manually | Worker appears with at least one role and one credential |
| 3 | Update a worker's credential expiry date | Updated expiry reflected in CredentialGate output |
| 4 | Deactivate a worker who has left | Worker no longer appears in SmartRank candidates |
| 5 | Download and review each export type | Can explain the purpose of each CSV and how it is used in payroll/invoicing |
| 6 | Import a payroll-prep CSV into the office system | Admin can describe the column mapping to their payroll system |

### Must not touch

- AuditIQ entries
- Allocation publish (admin imports data; dispatcher publishes allocations)
- Tenant configuration (this is a Cody / ops manager function)

### Success checklist

- [ ] Imported the company's full worker list correctly
- [ ] Can update credentials without creating duplicate records
- [ ] Downloaded and reviewed at least one payroll-prep CSV
- [ ] Has confirmed the CSV column mapping to the company's payroll system

### Failure risk

Admin creates duplicate workers by importing twice with slightly different name formats. Prevention: search for the worker before adding; use deactivation rather than deletion for departed workers.

---

## Path 5: DispatchTalon Support Worker

**Goal:** Can diagnose and resolve all 13 support categories; knows when to escalate; never says "fixed" without verification.

### Priority reading

1. `DISPATCHTALON_MASTER_OPERATING_DOCTRINE.md` — Sections 1–6, 8, 14
2. `docs/DISPATCHTALON_IMPLEMENTATION_PLAYBOOK.md` — Part 2 (Support Playbook, all 13 categories)
3. `docs/DISPATCHTALON_AGENT_SKILL.md` — Universal agent rules (if an AI agent)

### Must learn

| Step | Task | Verified by |
|------|------|-------------|
| 1 | Understand all 13 support categories | Can describe symptom, likely cause, and first check for each |
| 2 | Practice diagnosing login issues | Can resolve a password rotation issue without exposing credentials |
| 3 | Practice diagnosing SmartRank issues | Can trace a "no eligible workers" result to its likely cause |
| 4 | Practice diagnosing CredentialGate issues | Can identify a credential naming mismatch |
| 5 | Understand escalation triggers | Can name three issues that must be escalated without attempting a fix |
| 6 | Understand data protection rules | Can recite the hard rules from Section 14 of Master Doctrine |

### Must not touch

- AuditIQ entries (read-only; escalate any discrepancy)
- Live tenant data without explicit permission from Cody and the partner
- Any action that hard-deletes allocation or audit records

### Success checklist

- [ ] Has diagnosed and resolved a login issue in a test tenant
- [ ] Has diagnosed a SmartRank "no results" issue in a test tenant
- [ ] Can state the correct response to a request for hard-deletion of audit data
- [ ] Has confirmed: "never say fixed until verified" is the default standard

### Failure risk

Support worker applies a fix, assumes it worked, closes the issue, and does not verify. The issue recurs. Prevention: require the partner or a QA step to confirm each fix before the ticket is closed.

---

## Path 6: Sales Lead

**Goal:** Can qualify a lead, run a discovery call, match a tier, and send an appropriately scoped first proposal — without overpromising.

### Priority reading

1. `DISPATCHTALON_MASTER_OPERATING_DOCTRINE.md` — Sections 1, 2, 3, 10
2. `docs/DISPATCHTALON_LEAD_FUNNEL_SYSTEM.md` — Parts 1–4
3. `sales/dispatchtalon-design-partner-pack/design-partner-discovery-call-script.md`
4. `sales/dispatchtalon-design-partner-pack/design-partner-qualification-scorecard.md`
5. `sales/dispatchtalon-design-partner-pack/design-partner-outreach-messages.md`

### Must learn

| Step | Task | Verified by |
|------|------|-------------|
| 1 | Understand what DispatchTalon is and is not | Can answer all 10 objections without prompting |
| 2 | Score a lead using the qualification scorecard | Score recorded within 30 minutes of any qualifying conversation |
| 3 | Identify the correct tier for a given score | Can explain tier logic without referring to the document |
| 4 | Run the discovery call using the 12-question script | Can follow the script without reading it word-for-word |
| 5 | Send a post-call follow-up using the correct template | Template sent within 4 hours of the call |
| 6 | Handle all out-of-scope requests correctly | "No" to payroll, Xero, SMS automation — clear and without promise of timeline |
| 7 | Apply the banned vocabulary list | Can recite the eight banned terms and the approved alternatives |

### Must not touch

- Pricing until scope is agreed (scope first, price second, always)
- Integration commitments (no Xero, no MYOB, no direct SMS, no ERP)
- Compliance claims (not now, not "eventually")

### Success checklist

- [ ] Has scored at least three practice leads using the scorecard
- [ ] Has run at least one mock discovery call using the full script
- [ ] Can handle each of the 10 standard objections without losing the conversation
- [ ] Has reviewed the banned vocabulary list and can apply it in real-time

### Failure risk

Sales lead mentions Xero integration or payroll features during a call as "something we're working on" — partner hears this as a near-term commitment and builds it into their evaluation. Prevention: never mention a roadmap item during a sales conversation unless you have a confirmed delivery date and Cody's approval to share it.

---

## Path 7: Implementation Partner

**Goal:** Can execute the full 18-stage implementation process (from signed agreement to first weekly review) for a design partner, without Cody on every call.

### Priority reading

1. `DISPATCHTALON_MASTER_OPERATING_DOCTRINE.md` — Sections 1–6, 12, 13
2. `docs/DISPATCHTALON_IMPLEMENTATION_PLAYBOOK.md` — Full document
3. `sales/dispatchtalon-design-partner-pack/design-partner-pilot-scope.md`
4. `sales/dispatchtalon-design-partner-pack/design-partner-success-metrics.md`

### Must learn

| Step | Task | Verified by |
|------|------|-------------|
| 1 | Understand each of the 18 implementation stages | Can describe the gate condition and common failure for each stage |
| 2 | Provision and configure a test tenant | Tenant provisioned end-to-end without assistance |
| 3 | Complete a full worker import | All workers imported with roles and credentials correct |
| 4 | Configure the requirement catalogue | CredentialGate produces correct outcomes on test data |
| 5 | Lead a kick-off session | 90-minute kick-off completed; all Gate 4 items confirmed |
| 6 | Run the first WeSmartRank with the partner dispatcher | Dispatcher can run the next allocation without coaching |
| 7 | Check AuditIQ and explain it to the partner | Partner ops manager understands what they are looking at |
| 8 | Guide the partner through the first export | Admin has confirmed the CSV data and knows what to do with it |

### Must not touch

- Pricing (confirm with Cody before any number is discussed with the partner)
- Agreement terms (these are Cody's and the lawyer's responsibility)
- Scope changes to an active pilot without Cody's approval

### Success checklist

- [ ] Has completed a full test implementation (tenant-to-first-allocation) without assistance
- [ ] Can handle all 13 support categories in a test environment
- [ ] Understands the pilot health check schedule and can run the week 1 and week 4 checks
- [ ] Has confirmed with Cody: scope changes require written approval before implementation

### Failure risk

Implementation partner agrees to a scope change (e.g., "just build us a quick import from our spreadsheet") during the kick-off session without Cody's approval. Prevention: all scope changes are logged and referred to Cody before any commitment.

---

## Path 8: AI Agent

**Goal:** Can execute agent tasks within the defined boundaries without fabrication, without security breaches, and without violating product positioning.

### Required reading (must be read in full before any task)

1. `docs/DISPATCHTALON_AGENT_SKILL.md` — Full document (this is the constitutional layer for agent operation)
2. `DISPATCHTALON_MASTER_OPERATING_DOCTRINE.md` — Sections 1, 2, 8, 14

### Must learn (and confirm before operating)

| Rule | Confirmed |
|------|-----------|
| Never fabricate test results | ☐ |
| Never claim browser testing without browser use | ☐ |
| Never expose passwords, tokens, or secrets | ☐ |
| Never claim compliance, safety, or regulatory approval | ☐ |
| Never claim direct Xero/MYOB/SMS integration | ☐ |
| Always distinguish live capability from roadmap | ☐ |
| Always preserve the dispatcher decision boundary | ☐ |
| Always mark assumptions as `[ASSUMPTION]` | ☐ |
| Always report blockers explicitly | ☐ |
| Always stop at ambiguity and surface it | ☐ |

### Role-specific rules

Before executing as a specific agent type (Product Audit, QA Test, Sales Qualification, etc.), read the agent-specific rules in `DISPATCHTALON_AGENT_SKILL.md` Part 2 for that agent type.

### Must not do (universal)

- Hard-delete audit records
- Claim a fix is complete without verification
- Commit credentials to any file
- Apply a fix to a live tenant without explicit permission
- Present competitor data as verified without a source

### Success checklist

- [ ] Universal rules confirmed (all ten items above)
- [ ] Agent-specific stop conditions reviewed
- [ ] Agent-specific forbidden actions reviewed
- [ ] Escalation rules reviewed and understood

### Failure risk

Agent resolves an ambiguity silently by making an assumption, does not mark the assumption, and produces output that is treated as verified. Prevention: every assumption must be explicitly marked `[ASSUMPTION]` and surfaced to the human before it is acted on.

---

## Path 9: Investor / Grant Reviewer

**Goal:** Understands the product category, the commercial model, the current development stage, and the market opportunity — without accessing internal pricing or operational detail.

### Priority reading

1. `DISPATCHTALON_MASTER_OPERATING_DOCTRINE.md` — Sections 1, 3, 11 (introduction only), 16 (summary only), 18
2. `strategy/fcc-competitive-analysis.md` — For competitive context

### Must understand

| Topic | Key points |
|-------|-----------|
| Product category | Dispatch decision support for labour, crane, rigging, plant, transport, and lifting |
| Core wedge | A job may need four roles, not four people |
| Phase 1 status | Live backend; working features confirmed; no live pilot tenant with real operator data yet |
| Commercial model | Pilot tiers from Testing to Commercial; pricing is internal working model |
| Market size | Australian crane, rigging, labour, plant, and transport sectors; primary fit band 15–40 workers |
| Competitive position | No direct competitor with credential + role-coverage + audit in one product at this market size |
| IP | DispatchTalon is Pressure Systems' product; all rights reserved; name under trademark review |
| Stage | Design partner programme: Step 1.2 of market entry roadmap |

### Must not see

- Internal pricing without Cody's explicit approval for investor use
- Partner-identifying operational data
- Internal risk flags or lead scores for named individuals or companies
- Draft legal documents before lawyer review

### Success checklist

- [ ] Has read Section 18 of Master Doctrine
- [ ] Understands what the product does and the three things it explicitly does not do (payroll, compliance, direct integration)
- [ ] Understands that pricing is an internal working model and is not a public commitment

---

## Training Delivery Modes

| Mode | Best for | Notes |
|------|----------|-------|
| Self-directed reading | All paths as foundation | Complete priority reading before any hands-on session |
| Hands-on in test tenant | Dispatchers, admins, implementation partners | TEST-labelled data only; never a live partner tenant |
| Shadowed live session | First kick-off for implementation partners | Cody leads; partner observes; no independent actions |
| Mock discovery call | Sales leads | Role-play with a colleague before the first real call |
| Checklist sign-off | All paths | Training is not complete until the success checklist is confirmed |

---

## What training cannot fix

Training cannot fix a product that does not work as documented. Before training anyone on a feature, confirm the feature is working correctly in the current production deployment. A trainee who learns "how to run SmartRank" in a training session where SmartRank is broken will form a negative impression that persists.

The Product Audit Agent (see `DISPATCHTALON_AGENT_SKILL.md`) should confirm product readiness before any external training or kick-off session.

---

*The goal of training is not to make people familiar with the interface. It is to make people capable of operational use — meaning they can diagnose a problem, explain a concept to a sceptical dispatcher, and act within the product boundary without needing to ask what they should not say. That is a higher bar than a product tour, and it is the bar this curriculum sets.*
