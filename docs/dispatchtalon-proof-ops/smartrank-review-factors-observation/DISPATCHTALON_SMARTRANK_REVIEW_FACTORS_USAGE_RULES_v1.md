# DispatchTalon SmartRank Review Factors Usage Rules v1

Status: Internal usage rules
Feature: SmartRank Review Factors v1
Audience: founder, pilot-support operator, admin users, product reviewers

## Core Rule

“SmartRank Review Factors are for placement-specific operational review only.

They are not worker ratings, performance labels, liability notes, or blacklists.

Only record factual, documented, operationally relevant context that you would be comfortable explaining professionally.”

## What Review Factors Are For

Use Review Factors to record suitability context that affects a specific placement review.

Appropriate context may relate to:

- role requirements
- site requirements
- client requirements
- job type
- asset or plant pairing
- documented credential or induction review
- operational notes that affect whether an allocation should be manually confirmed

The correct frame is:

```text
Does this person, asset, role, site, and job context fit this placement?
```

Not:

```text
Is this worker good or bad?
```

## Approved Language

Use:

- Review required
- Placement review
- Operations review
- Review factor
- Suitability context
- Manual confirmation
- Context note
- Admin review
- Dispatcher confirms
- Archived factor
- Non-overridable block

## Do Not Use

Do not use Review Factors to record:

- personal opinions
- character judgements
- unsupported performance claims
- broad worker labels
- blacklist-style notes
- legal conclusions
- compliance approval
- safety certification
- payroll approval
- protected-attribute details
- medical details
- anything that should be handled through a separate HR, safety, legal, or management process

## Severity Rules

| Severity | Use |
| --- | --- |
| `info` | Context only. Should not move a candidate out of normal SmartRank grouping. |
| `caution` | Operational note that should be visible but does not require allocation confirmation by itself. |
| `requires_review` | Candidate may still be suitable, but admin confirmation and a reason are required before confirming allocation. |
| `hard_block` | Candidate should not be assigned for that placement context. Non-overridable in v1. |

## Admin-Only Write Boundary

For v1:

- admins can create, edit, archive, and view Review Factors
- supervisors can view relevant SmartRank context only
- dispatchers can view relevant SmartRank context only
- viewer/advisor users have no write access
- `requires_review` confirmation requires an admin reason
- `hard_block` is non-overridable

Supervisor write access is a future decision and depends on RBAC, audit evidence, and low misuse risk.

## Review Before Creating A Factor

Before creating a Review Factor, ask:

1. Is this factual?
2. Is it documented or explainable?
3. Is it specific to a role, site, client, job type, asset, or placement context?
4. Would this wording still look professional if reviewed later?
5. Is this better handled by a credential record, site requirement, or normal management process?
6. Is this too broad to be useful?
7. Should this expire or be archived after a defined period?

If the answer is unclear, do not create the factor yet.

## When To Archive

Archive a Review Factor when:

- the context no longer applies
- the job, site, client, asset, or requirement changed
- the factor was too broad or unclear
- the factor was created for test/demo use
- the pilot team decides it should no longer affect SmartRank

Archived factors should remain available as audit context where the system supports it, but should not affect current SmartRank grouping.

## Claim Boundary

Do not describe Review Factors as:

- autonomous dispatch
- worker scoring
- compliance approval
- safety certification
- legal protection
- payroll approval
- guaranteed decision quality

Use this description instead:

```text
SmartRank Review Factors add reviewable suitability context before a dispatcher or admin confirms the allocation.
```

## First 7 Days

During the first 7 days after release:

- keep create/edit/archive admin-only
- track confusion and permission requests
- do not expand categories
- do not add automation
- do not create medical or work-capacity categories
- do not convert factors into reports for external users
- review all active factors for safe wording before using them as pilot evidence
