# DispatchTalon SmartRank Review Factors 7-Day Observation Plan

Status: Internal pilot observation plan
Feature: SmartRank Review Factors v1
Release: PR #66
Observation window: First 7 days of controlled pilot use

## Goal

Confirm whether SmartRank Review Factors improves pilot dispatch review by adding factual placement context without turning into worker labels, broad risk scoring, or premature automation.

The feature should help users understand why a worker may be suitable, needs review, or is blocked for a specific placement context.

The feature must remain:

- placement-specific
- reviewable
- factual
- admin-controlled
- claim-safe
- useful to dispatchers without replacing dispatcher judgement

## What To Observe

Track whether Review Factors help answer these questions:

- Does the dispatcher understand why SmartRank placed someone in Top ranked, Review required, or Blocked?
- Does the context relate to the job, role, site, client, or asset rather than the worker as a person?
- Are admins creating factors with clear operational wording?
- Are supervisors or dispatchers asking for write access too soon?
- Are users trying to record subjective, punitive, or unsupported comments?
- Are users confused by the difference between `caution`, `requires_review`, and `hard_block`?
- Are users trying to override `hard_block`?
- Are archived factors correctly ignored by SmartRank?
- Does the feature reduce repeat explanation between admin, supervisor, and dispatcher?

## Who To Ask

Ask for feedback from:

- admin users who create Review Factors
- supervisors who need to understand review context
- dispatchers who use SmartRank during allocation
- demo/advisor users reviewing product clarity
- pilot-support operators monitoring safe usage

Do not ask external reviewers to assess real pilot records unless the tenant has approved that review and private data is removed.

## Daily Check-In Questions

Use these questions during the first 7 days:

1. Did any Review Factors get created today?
2. Were the factors based on documented operational context?
3. Did any factor move a candidate into Review required or Blocked?
4. Did the dispatcher understand why the candidate was grouped that way?
5. Was an admin confirmation reason used where required?
6. Did anyone ask to edit or create factors without admin access?
7. Did anyone try to record subjective or personal judgement?
8. Did any factor feel too broad, stale, or unclear?
9. Did archived factors stop affecting SmartRank as expected?
10. Did the feature help the team make a clearer dispatch decision?

## Red Flags

Treat these as stop-and-review signals:

- Review Factors are used as worker ratings or performance labels.
- Users record unsupported opinions, personality comments, or personal judgement.
- Users ask to apply one factor broadly across many unrelated placements.
- Users try to override a `hard_block`.
- Dispatchers think SmartRank made the final decision automatically.
- Admins create factors with unclear wording that cannot be explained professionally.
- Supervisors or dispatchers repeatedly ask for write access before the boundary is understood.
- Users confuse Review Factors with compliance approval, safety certification, payroll approval, or legal protection.

## Misuse Signals

Investigate immediately if any user:

- records non-operational comments
- uses Review Factors to punish a worker
- treats a Review Factor as permanent worker status
- creates a factor without a clear role, site, client, job, or asset context
- writes anything they would not be comfortable explaining in a professional review
- uses Review Factors as a substitute for normal worker-management processes

## Good-Use Signals

Good usage looks like:

- factual context tied to a specific placement
- clear distinction between suitability context and availability
- Review required used when a human needs to confirm the placement
- hard block used only for a clear non-overridable operational boundary
- dispatcher still makes or confirms the final allocation decision
- admin can explain why the factor exists
- archived factors no longer influence current allocation review
- the feature reduces repeated verbal explanation between operations staff

## Admin-Only Boundary Review

For v1, create, edit, and archive actions remain admin-only.

Review the boundary daily:

- Are admins able to maintain factors without bottlenecking dispatch?
- Are supervisors able to understand relevant context as view-only users?
- Are dispatchers able to use SmartRank without needing write access?
- Are permission requests based on real workflow need or convenience?
- Would broader write access increase the risk of unsupported comments?

Do not expand permissions during the first 7 days unless a genuine operational blocker appears and the change is reviewed separately.

## When To Consider Supervisor Write Access Later

Supervisor write access may be considered later only if:

- admins are becoming a real bottleneck
- supervisors understand the placement-specific boundary
- review wording remains factual and professional
- audit evidence shows low misuse risk
- there is a clear review process for created factors
- RBAC or equivalent access control is ready to separate supervisors from general dispatch users

Supervisor write access is not approved in v1.

## What Not To Build Yet

Do not build during this observation window:

- custom permission matrix
- supervisor factor creation
- dispatcher factor creation
- automatic factor generation
- AI-generated worker notes
- protected-attribute or medical-detail categories
- score weights exposed as worker value ratings
- client-facing factor reports
- automated allocation approval
- broad analytics dashboards
- notification workflows

The purpose of this window is observation and control, not expansion.

## Decision Gate After 7 Days

At the end of the 7-day window, decide one of:

| Decision | Meaning |
| --- | --- |
| Continue v1 unchanged | Feature is useful and safe enough for continued controlled pilot use. |
| Tighten wording or UI copy | Feature works, but users need clearer explanation or stronger boundary language. |
| Keep admin-only and extend observation | Value is present, but misuse or confusion risk is still uncertain. |
| Prepare supervisor-write proposal | Evidence supports a narrow future permission change after RBAC or equivalent controls. |
| Pause feature expansion | Confusion, misuse, or claim-risk signals are too high. |

Minimum evidence required before permission expansion:

- at least one real admin-created use case
- no unsafe language in active Review Factors
- no evidence of worker-label misuse
- dispatcher can explain Review required without treating it as automatic rejection
- hard block remains understood as non-overridable
- archived factors no longer affect SmartRank

## 7-Day Summary Template

Use this at the end of the observation period:

```text
Observation window:
Tenants observed:
Review Factors created:
Review Factors archived:
Review required events:
Hard block events:
Admin confirmation reasons used:
Permission-change requests:
Confusion reports:
Misuse signals:
Commercial value signals:
Recommended decision:
Required fixes:
Do-not-build-yet:
```
