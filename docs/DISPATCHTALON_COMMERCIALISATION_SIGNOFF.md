INTERNAL ONLY — NOT FOR PUBLIC DISTRIBUTION

Product: DispatchTalon by Pressure Systems
Status: Internal operating doctrine
Use: For DispatchTalon workers, agents, implementation partners, sales operators, support operators, and founder-led commercialisation.
Public use: Not approved.
Pricing: Internal working model only.
Legal: Not legal advice. Not compliance advice. Not engineering advice.

Current route note: The public product route may still use `/liftiq/` for legacy stability, but the current product brand is DispatchTalon. LIFTIQ references should be treated as historical/legacy route context only.

---

# DispatchTalon — Commercialisation Sign-off

| Field | Value |
|---|---|
| Last reviewed | 2026-05-20 |
| Owner | Cody / Pressure Systems |
| Update trigger | Any PR changing public homepage, pricing, design-partner terms, tenant/auth/security, exports, or any item listed in the readiness checklists below |
| Not public use | This sign-off file governs internal go/no-go decisions; it is not a customer or investor document |
| Claim boundary reminder | Sign-off must verify that public-facing material stays inside the decision-support claim boundary |

This document is the gate between **internal pilot operations** and **broader commercial release**. No public commercialisation step may proceed without an explicit sign-off recorded here.

Status values for every item:

- **READY** — verified, owner-signed, evidence linked
- **NOT READY** — not yet at the required state
- **BLOCKED** — known blocker recorded in section 7

---

## 1. Product Readiness Checklist

| Item | Required state | Status | Owner | Evidence |
|---|---|---|---|---|
| Decision-layer stack stable | Eligibility → Audit operates end-to-end in staging without manual intervention | NOT READY | Cody | — |
| Role coverage suggestions with review warnings | Multi-role suggestions surface warnings as documented | NOT READY | Cody | `docs/dispatchtalon-multi-role-allocation-architecture.md` |
| CredentialGate handling of expired/expiring/missing | All three cases produce documented behaviour | NOT READY | Cody | — |
| FatigueGuard override with reason capture | Override reason recorded into audit log every time | NOT READY | Cody | — |
| Publish allocation triggers SMS path | Notification delivery surfaces success/failure to the dispatcher | NOT READY | Cody | `docs/dispatchtalon-sms-allocation-notification-architecture.md` |
| Audit log append-only and queryable | No reachable code path mutates or deletes log entries | NOT READY | Cody | — |
| Exports schema-versioned | Schema version present in every export header | NOT READY | Cody | `docs/dispatchtalon-export-architecture.md` |
| Tenant isolation verified | No cross-tenant data leakage under any tested action | NOT READY | Cody | — |
| Public homepage matches claim boundary | No compliance/safety/engineering authority claims on the public site | NOT READY | Cody | — |

---

## 2. Market Readiness Checklist

| Item | Required state | Status | Owner | Evidence |
|---|---|---|---|---|
| First-five lead sheet populated | Five Tier-A leads at Gate ≥ 2 | NOT READY | Cody | `docs/DISPATCHTALON_LEAD_FUNNEL_SYSTEM.md` |
| Two live design-partner pilots | At Stage 7 (pilot active) or later in playbook | NOT READY | Cody | — |
| Week-12 success metrics achieved on at least one pilot | Metrics meet exit criteria in design-partner pack | NOT READY | Cody | — |
| Approved outreach templates in use | All outbound traceable to a template | NOT READY | Cody | `sales/dispatchtalon-design-partner-pack/` |
| Competitive positioning documented | Internal competitive note current within 90 days | NOT READY | Cody | — |
| Sector messaging stays inside boundary | Reviewed sample of recent messages | NOT READY | Cody | — |

---

## 3. Legal / IP Readiness Checklist

| Item | Required state | Status | Owner | Evidence |
|---|---|---|---|---|
| Design-partner terms current and signed for each live pilot | Signed terms on file per partner | NOT READY | Cody | — |
| Public site disclaims compliance/safety/engineering authority | Disclaimer present and reviewed | NOT READY | Cody | — |
| Privacy policy current | Reviewed within 12 months | NOT READY | Cody | `privacy-policy.html` |
| Trademark and brand use clear | DispatchTalon brand use is internally documented | NOT READY | Cody | — |
| Third-party dependencies licensed | All production dependencies have compatible licences recorded | NOT READY | Cody | — |
| Data residency and access posture documented | Internal note covers where data lives and who can reach it | NOT READY | Cody | — |
| No external compliance claim in marketing | Sample audit shows zero | NOT READY | Cody | — |

---

## 4. Operational Readiness Checklist

| Item | Required state | Status | Owner | Evidence |
|---|---|---|---|---|
| Implementation playbook drilled end-to-end | At least one full 18-stage run completed against a real tenant | NOT READY | Cody | `docs/DISPATCHTALON_IMPLEMENTATION_PLAYBOOK.md` |
| Support playbook in use | At least five tickets resolved using the documented structure | NOT READY | Cody | — |
| Password rotation flow exercised | Rotation completed for every live tenant after provisioning | NOT READY | Cody | — |
| SMS provider fallback documented | Documented and tested fallback path | NOT READY | Cody | — |
| Backup and recovery tested | Documented restore exercised within 90 days | NOT READY | Cody | — |
| On-call/contact path for live pilots | Single named contact per pilot, documented | NOT READY | Cody | — |
| Audit log review cadence | At least monthly review per live pilot | NOT READY | Cody | — |

---

## 5. Commercial Readiness Checklist

| Item | Required state | Status | Owner | Evidence |
|---|---|---|---|---|
| Internal working pricing model documented | Model documented; no public commitment | NOT READY | Cody | — |
| Paid continuation agreement template | Template exists and approved | NOT READY | Cody | — |
| Invoicing path operational | Test invoice issued and paid path verified | NOT READY | Cody | — |
| Refund / pause / exit posture documented | Internal note covers each scenario | NOT READY | Cody | — |
| Founder-led handoff plan | Plan exists for moving founder off critical path post-launch | NOT READY | Cody | — |
| Public pricing decision | Decision recorded (publish / keep private); current state aligned | NOT READY | Cody | — |

---

## 6. Sign-off Rule

Commercialisation sign-off requires **all** of the following:

1. Every item in sections 1–5 is **READY** or has a documented exception accepted by Cody.
2. No item is in **BLOCKED** state in section 7 without a written mitigation plan and a target unblock date.
3. The most recent weekly review (lead funnel) shows the first-five sheet is populated and active.
4. At least one design partner has reached the week-12 success-metrics review and met exit criteria.
5. Cody records an explicit, dated sign-off note in this file referencing the evidence column for each section.

Sign-off is **per release scope** (e.g., "open public homepage to inbound", "open paid continuation", "open external referrals"). A prior sign-off does not authorise a later, broader release.

---

## 7. Known Blockers

| Blocker | Affects | Owner | Target unblock | Notes |
|---|---|---|---|---|
| _none recorded_ | — | — | — | When a blocker exists, add a row here with concrete fields. Do not leave blockers implicit. |

---

## 8. Next-Action Gate

The next gate is the first item from section 1–5 that is **NOT READY** or **BLOCKED** with the highest impact on a real design partner.

To advance the gate:

1. Re-read the master operating doctrine and the relevant architecture doc.
2. Confirm the item's required state is still accurate.
3. Drive the item to **READY** state with linked evidence.
4. Update the **Last reviewed** field on this file.
5. Re-evaluate whether commercialisation sign-off is now possible per section 6.

Until that gate clears, no broader commercial step is approved.
