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

# DispatchTalon Implementation Playbook

## 1. Implementation Principle

Clean setup before workflow proof.

DispatchTalon pilots must start with controlled tenant setup, clean company data, verified admin access, reviewed requirements, realistic worker data, reviewed job data, first SmartRank, first role coverage review, first manual publish, audit check, and export check.

Hard rule: never say "fixed" until verified.

## 2. Implementation Process

| Stage | Owner | Required inputs | Output | Success check | Common failure | IF / THEN fix |
|---|---|---|---|---|---|---|
| Lead qualified | Sales lead | Lead score and pain notes | Qualified lead record | Score supports next step | Weak fit | IF score is low, THEN park or nurture. |
| Discovery complete | Founder/sales | Discovery notes | Confirmed use case | Buyer pain is specific | Generic curiosity | IF pain is vague, THEN ask for one real job scenario. |
| Tier selected | Founder | Fit, scope, support risk | Internal tier recommendation | Scope matches capability | Public pricing expectation | IF pricing is requested, THEN mark internal working model only until agreement. |
| Agreement sent | Founder/admin | Approved scope and terms | Agreement sent | Buyer has review copy | Unsupported claims requested | IF claims exceed product, THEN revise scope. |
| Agreement signed | Founder/admin | Signed pilot agreement | Implementation approved | Authority confirmed | Verbal-only approval | IF unsigned, THEN do not provision production-like access. |
| Tenant created | Implementation | Company name, slug, mode | Clean company tenant | No fake workers/jobs/assets | Duplicate or dirty tenant | IF dirty, THEN create clean tenant or reset only with approval. |
| Admin provisioned | Implementation | Admin email, role | Admin user | User id and company id valid | Null id or wrong company | IF user invalid, THEN diagnose schema before retrying. |
| Password rotation completed | Admin/user | Temporary credential handled privately | Access with changed password | `must_change_password` cleared | Login friction | IF blocked, THEN diagnose auth state without printing secrets. |
| Build My Business setup | Admin/implementation | Operating mode, timezone, catalogue | Company setup complete | Mode and catalogue saved | Wrong mode | IF wrong, THEN update before worker/job setup. |
| Worker import | Admin/implementation | Clean CSV or pasted data | Workers created | Roles and credentials map | Header or role mismatch | IF import errors, THEN fix headers/mapping and re-preview. |
| Requirement catalogue setup | Admin/implementation | Company requirements | Enabled catalogue | Relevant credentials/equipment selected | Irrelevant requirements | IF cluttered, THEN reduce to actual business needs. |
| Assets added if needed | Admin/implementation | Plant numbers and classes | Asset register | Asset numbers under correct classes | Fake or duplicate asset | IF duplicate, THEN correct before job assignment. |
| First job created | Dispatcher | Reviewed job details | Structured job | Roles, counts, credentials, schedule saved | Rough note unreviewed | IF imported, THEN review before create. |
| First SmartRank run | Dispatcher | Job and workers | Ranked and blocked results | Blocks/warnings understood | No eligible workers | IF none, THEN inspect credentials, role requirements, schedule. |
| First role coverage review | Dispatcher | SmartRank result | Coverage decision | Conservative and suggested headcount understood | Silent collapse | IF warning exists, THEN record review/override reason. |
| First allocation published | Dispatcher | Confirmed allocation | Manual publish status | SMS preview copied/manual publish recorded | Accidental send assumption | IF SMS provider asked, THEN state manual preview only. |
| Audit checked | Dispatcher/support | Audit page or endpoint | Decision trail verified | Relevant events visible | Missing event | IF missing, THEN inspect route/service before claiming fixed. |
| Export checked | Admin/support | Export Centre | CSV downloaded | Headers and tenant data correct | Payroll/invoice misunderstanding | IF misunderstood, THEN restate CSV office handoff boundary. |
| Weekly feedback started | Founder/support | Weekly usage evidence | Review cadence | Issues and outcomes logged | No evidence | IF no usage, THEN reset pilot plan or exit. |

## 3. Tenant Setup

Tenant setup must confirm:

- Company id and company slug are correct.
- Company name is correct.
- Access status is active for the pilot.
- Operating mode is chosen intentionally.
- Default timezone is set.
- No default workers, jobs, or fake assets exist unless clearly synthetic demo data is approved.
- Admin user belongs to the correct company.
- Admin user has a non-null user id.

## 4. Admin Provisioning

Admin provisioning rules:

- Temporary password handling must stay private.
- Do not print passwords in reports.
- Do not commit credentials.
- Verify `users.id` is not null.
- Verify `users.company_id` references `companies.id`.
- Verify `must_change_password` follows current auth rules.
- Verify login after password change before declaring access complete.

## 5. Password Rotation

If password rotation blocks access:

1. Confirm the user exists.
2. Confirm the company exists and is active.
3. Confirm the user belongs to the company.
4. Confirm password hash exists.
5. Confirm `must_change_password` state.
6. Reset privately if authorised.
7. Verify login without printing token or password.

## 6. Build My Business

Implementation must configure:

- Labour-only or plant + labour mode.
- Company default timezone.
- Required credential categories.
- Equipment, transport, civil, rail, energy, or VOC requirements where relevant.
- Asset register only for plant + labour operators.

The goal is a workspace that reflects the actual operation, not a generic demo.

## 7. Worker Import

Worker import should use reviewed data only.

Check:

- First name and last name requirements.
- Supported worker roles.
- Supported backend employment type.
- Credentials mapped to current catalogue.
- Synthetic data for demos.
- No real private data in screenshots or demo recordings.

## 8. Requirement Catalogue Setup

Use the corrected taxonomy:

- High Risk Work for genuine HRWL classes.
- VOC as a separate group.
- Working at Height separate from High Risk Work.
- Safety / Site for White Card, First Aid, Site Induction, Client Induction.
- Heavy Vehicle for MC, HC, HR.
- Rail for RIW, SARC, WETT.
- Energy / Electrical for Electrical Spotter.
- Civil / Plant for Excavator, Telehandler, Front End Loader, and similar plant/civil items.

## 9. Asset Setup

For plant + labour pilots:

- Add actual plant numbers only when approved.
- Keep equipment class separate from asset number.
- Do not imply fleet maintenance or legal road access approval.
- Use crane, counterweight, and transport review prompts as review prompts only.

## 10. First Job

First job must include:

- Job title.
- Client/site/location if approved for pilot use.
- Date, start time, end time, and timezone.
- Required roles and counts.
- Separate-worker-only flags where needed.
- Required credentials.
- Asset or plant context where relevant.
- Notes reviewed by dispatcher.

## 11. First SmartRank

First SmartRank review must confirm:

- Eligible workers appear.
- Blocked workers explain why they are blocked.
- CredentialGate output is understood.
- FatigueGuard output is understood.
- Schedule conflict output is understood.
- Role coverage is visible where relevant.

## 12. First Role Coverage Review

Use a job that proves the wedge:

- Truck Driver x2.
- Dogman x1.
- Rigger x1.

Expected review:

- Conservative headcount: 4 role slots.
- Suggested minimum headcount may be 2 if two workers can cover truck driving plus compatible Dogman/Rigger duties.
- Dispatcher confirms suitability.
- Review warnings remain visible.

## 13. First Publish Allocation

Publish allocation must remain deliberate:

1. Select worker and role coverage.
2. Review warnings.
3. Confirm allocation.
4. Open Publish allocation.
5. Preview SMS.
6. Copy/send manually outside DispatchTalon if approved.
7. Mark manually published.
8. Confirm audit event.

Do not send real SMS from DispatchTalon unless a future approved provider phase is implemented and verified.

## 14. Audit Check

Verify audit events for:

- Job created or job created from brief.
- SmartRank generated.
- Role coverage suggested.
- Role coverage confirmed.
- Review required or override recorded where applicable.
- Allocation confirmed.
- Allocation publish previewed.
- Allocation published manual.

## 15. Export Check

Verify exports:

- Workers CSV.
- Jobs CSV.
- Allocations CSV.
- Payroll-prep CSV.
- Invoice-prep CSV.
- Audit CSV.
- Metrics CSV.

Boundary:

Payroll-prep is scheduled/allocation review data only. Invoice-prep is job/activity review data only. Exports are CSV office handoff, not accounting integration.

## 16. Weekly Feedback

Each weekly review should capture:

- Jobs created.
- SmartRank runs.
- Role coverage examples.
- Warnings and blocks.
- Overrides and reasons.
- Publish allocation usage.
- Audit usefulness.
- Export usefulness.
- Support issues.
- Decision for next week.

## 17. Support Playbook

| Category | Symptom | Likely cause | First check | Fix | Escalation |
|---|---|---|---|---|---|
| Login/password | User cannot access portal. | Wrong password, forced rotation, bad user row, inactive company. | User id, company id, company status, `must_change_password`. | Reset privately or repair user row if authorised. | Auth/security owner. |
| Tenant setup | Wrong workflow shown. | Operating mode incorrect. | Company operating mode. | Update mode and catalogue. | Implementation lead. |
| Worker import | First name, last name, role, or employment type error. | Header mismatch or unsupported value. | Import preview errors. | Correct headers and supported values. | Support lead. |
| Worker save | Changes do not persist. | Validation or route error. | PATCH response and reload. | Fix validation/data issue. | Backend owner. |
| Job create | Job fails or missing requirements. | Required fields or malformed role requirements. | Request payload and validation error. | Correct fields and retry. | Backend owner. |
| SmartRank | No eligible workers. | Missing credentials, roles, schedule conflict, fatigue block. | Blocked worker reasons. | Correct data or explain true block. | Product owner if logic issue. |
| CredentialGate | Worker blocked unexpectedly. | Credential normalisation mismatch or missing credential. | Worker credentials and job requirements. | Correct credential mapping or add valid credential. | Backend owner. |
| Role coverage | Coverage not suggested. | Missing role, missing credential, distinct worker flag, disallowed rule. | Role coverage plan and warnings. | Correct job/worker data or rule. | Product owner. |
| Publish allocation | Preview blocked or warning appears. | Missing mobile, no confirmed allocation, acknowledgement required. | Preview response. | Acknowledge or correct worker contact data. | Support lead. |
| Audit | Event not visible. | Event not emitted, filter active, or request failed. | Audit filter and event type. | Clear filter or inspect service. | Backend owner. |
| Exports | CSV missing data. | Date filter, tenant scope, archived data excluded. | Query params and tenant. | Adjust filters or include archived if intended. | Backend owner. |
| Mobile usability | UI crowded or action hidden. | Layout issue or unsupported viewport. | Browser/device screenshot. | Log UI defect. | Frontend owner. |
| Data cleanup | Tenant contains wrong data. | Demo residue or import mistake. | Tenant counts and audit. | Archive/reset only if authorised. | Founder approval if destructive. |

## 18. Hard-Stop Conditions

Stop implementation when:

- Agreement is not signed for a real pilot.
- Credentials or tokens would be exposed.
- Real customer data would appear in public screenshots or recordings.
- Tenant isolation is uncertain.
- Admin user row is structurally invalid.
- Password rotation cannot be verified.
- Role coverage is being interpreted as approval or compliance.
- Buyer expects direct SMS sending, payroll, invoicing, Xero/MYOB sync, permit approval, road access approval, lift engineering, or autonomous dispatch as current capability.
- Support burden exceeds agreed pilot scope.
