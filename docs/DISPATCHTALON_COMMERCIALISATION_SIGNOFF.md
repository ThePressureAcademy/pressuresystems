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

# DispatchTalon Commercialisation Sign-off

## 1. Status Format

Use one status per line item:

- READY
- NOT READY
- BLOCKED

Do not mark READY without evidence.

## 2. Product Readiness Checklist

| Check | Status | Evidence | Owner | Next action |
|---|---|---|---|---|
| Login stable | NOT READY |  |  | Verify with demo/test tenant. |
| Clean tenant setup | NOT READY |  |  | Confirm no default workers/jobs/assets. |
| Worker creation/import | NOT READY |  |  | Import synthetic data and verify worker detail. |
| Job creation/import | NOT READY |  |  | Create manual job and import job brief. |
| SmartRank | NOT READY |  |  | Run on credentialed job. |
| CredentialGate | NOT READY |  |  | Confirm hard block and valid match cases. |
| FatigueGuard | NOT READY |  |  | Confirm warning/block behaviour. |
| Role coverage | NOT READY |  |  | Confirm conservative versus suggested headcount. |
| Publish allocation | NOT READY |  |  | Confirm SMS preview/copy/manual publish. |
| Audit | NOT READY |  |  | Confirm events visible and append-only. |
| Exports | NOT READY |  |  | Download all seven CSVs. |
| Tenant isolation | NOT READY |  |  | Verify with two disposable tenants or automated test evidence. |

## 3. Market Readiness Checklist

| Check | Status | Evidence | Owner | Next action |
|---|---|---|---|---|
| Homepage current | NOT READY |  |  | Verify public route and claim boundaries. |
| Design Partner Pack complete | NOT READY |  |  | Review pack against current product truth. |
| Lead sheet ready | NOT READY |  |  | Confirm first-five lead qualification sheet. |
| Outreach messages ready | NOT READY |  |  | Confirm no unsupported claims. |
| Sales script ready | NOT READY |  |  | Confirm role coverage and boundaries. |
| Demo video safe | NOT READY |  |  | Confirm no passwords, real data, or overclaims. |
| Internal pricing approved | NOT READY |  |  | Founder approval required; not public pricing. |

## 4. Legal/IP Readiness Checklist

| Check | Status | Evidence | Owner | Next action |
|---|---|---|---|---|
| DispatchTalon name screening planned | NOT READY |  |  | Arrange legal/trademark review. |
| Legal/trademark clearance obtained | BLOCKED |  |  | Do not claim clearance until reviewed. |
| Pilot agreement lawyer-reviewed | NOT READY |  |  | Send agreement outline for review. |
| IP ownership register started | NOT READY |  |  | Record assets, docs, code, and marks. |
| Public compliance claims removed | NOT READY |  |  | Scan public pages and sales assets. |
| Public pricing table absent | NOT READY |  |  | Confirm no public pricing table. |

## 5. Operational Readiness Checklist

| Check | Status | Evidence | Owner | Next action |
|---|---|---|---|---|
| Support boundaries defined | NOT READY |  |  | Confirm what is and is not supported. |
| Onboarding process documented | NOT READY |  |  | Use implementation playbook. |
| Password reset process safe | NOT READY |  |  | Confirm no password printing. |
| Data cleanup process safe | NOT READY |  |  | Confirm archive/reset rules. |
| Weekly review process ready | NOT READY |  |  | Confirm review cadence and template. |
| Screenshot/recording rules ready | NOT READY |  |  | Confirm synthetic data only. |

## 6. Commercial Readiness Checklist

| Check | Status | Evidence | Owner | Next action |
|---|---|---|---|---|
| First 5 leads scored | NOT READY |  |  | Use first-five lead qualification sheet. |
| Top 2 contacted | NOT READY |  |  | Founder-led outreach only after scoring. |
| First discovery call booked | NOT READY |  |  | Book only with qualified target. |
| One pilot scope drafted | NOT READY |  |  | Keep scope bounded and evidence-led. |
| Agreement ready | NOT READY |  |  | Legal review required before reliance. |
| Support capacity confirmed | NOT READY |  |  | Avoid high-burden weak leads. |

## 7. Current Risk Register

| Risk | Status | Control |
|---|---|---|
| Pilot login/password friction can damage trust. | OPEN | Verify login and password rotation before handoff. |
| DispatchTalon name still requires proper legal screening. | OPEN | Do not claim legal/trademark clearance. |
| Pricing remains internal working model. | OPEN | Do not publish or quote without approved scope. |
| SMS provider send is not live. | OPEN | Use manual SMS preview/copy/manual publish language only. |
| Xero/MYOB integration is not live. | OPEN | Use CSV office handoff and future-roadmap language only. |
| Public route still uses `/liftiq/`. | OPEN | Explain as legacy route stability if needed. |
| Live pilot support burden must be controlled. | OPEN | Score support risk before pilot. |
| Weak leads can consume founder time. | OPEN | Use scoring thresholds and park low-fit leads. |
| Screenshots/recordings must not expose real customer data. | OPEN | Use demo tenant and synthetic data. |
| Role coverage must not be misunderstood as approval/compliance. | OPEN | Use review-required and dispatcher-confirmation language. |

## 8. Sign-off Record

| Field | Entry |
|---|---|
| Review date |  |
| Reviewer |  |
| Product readiness status | NOT READY |
| Market readiness status | NOT READY |
| Legal/IP readiness status | BLOCKED |
| Operational readiness status | NOT READY |
| Commercial readiness status | NOT READY |
| Overall status | NOT READY |
| Known blocker |  |
| Next-action gate |  |
| Evidence link or location |  |

## 9. Next-Action Gate

Before major commercialisation:

1. Verify live login with a demo/test tenant.
2. Verify worker import, job creation/import, SmartRank, role coverage, publish allocation, audit, and exports.
3. Verify public homepage and supporting pages carry current DispatchTalon truth.
4. Verify demo video uses only synthetic data.
5. Verify first five leads are scored.
6. Verify top two outreach targets are founder-approved.
7. Verify agreement and legal/IP review path.

## 10. Failure Modes

| Failure mode | Warning sign | Prevention | Response |
|---|---|---|---|
| Overbuilding before pilot feedback | New features requested before real jobs are tested. | Enforce pilot evidence gates. | Stop feature work and run real workflow test. |
| Free pilots consuming support | High-touch requests with no commercial seriousness. | Score support burden and seriousness. | Park or convert to bounded paid support. |
| Public claims exceeding product reality | Website or sales copy uses approval or automation language. | Claim-boundary scan before release. | Rewrite and re-verify. |
| Pricing shown too early | Lead asks for public rate card. | Keep pricing internal working model only. | Give scope-first conversation, not public pricing. |
| Integration requests derailing focus | Buyer asks for Xero, MYOB, payroll, SMS provider, telematics, or ERP before workflow proof. | Explain export-first and manual publish boundaries. | Park integration request as future roadmap. |
| Role coverage misunderstood as approval | Buyer says the system proves a combined role is allowed. | Use review-required language. | Correct immediately and document boundary. |
| SMS publish misunderstood as automatic send | Buyer expects worker notification on selection. | Demonstrate preview/copy/manual publish only. | Correct and document. |
| Export Centre misunderstood as accounting integration | Buyer asks whether exports post to accounting. | Use CSV office handoff language. | Correct and document. |
| Poor password/access setup damaging trust | First login fails. | Test access before handoff. | Diagnose auth state before retrying. |
| No audit of real outcomes | Weekly review has anecdotes only. | Export audit/metrics and record examples. | Reset evidence capture. |
| Homepage becoming too dense | Buyers cannot state what the product does. | Keep public page focused on wedge and boundaries. | Cut copy and retest. |
| Founder time diluted | Low-fit leads get long calls. | Use scoring model. | Park low-fit leads. |

## 11. Final Sign-off Rule

DispatchTalon is READY for broader outreach only when product, market, operational, and commercial gates have evidence, legal/IP blockers are explicitly managed, and the next outreach target is qualified.

Until then, status remains NOT READY or BLOCKED.
