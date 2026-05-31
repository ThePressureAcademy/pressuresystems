# DispatchTalon SmartRank Review Factors v1

## Purpose

SmartRank Review Factors add reviewable placement context to SmartRank without turning DispatchTalon into worker scoring, compliance approval, safety certification, or autonomous dispatch.

The rule is:

> Rank placement fit, not the person.

Review Factors exist to help an operations user understand whether a worker is suitable for a specific placement, site, client, role, job context, or credential condition before a dispatcher confirms the allocation.

## Safe Product Language

Use:

- SmartRank Review Factors
- Role Suitability Review
- Placement Review
- Placement Review Flags
- Manual review required
- Placement-specific review support
- Reviewable suitability context
- Operations review required

Do not use in active UI, API labels, reports, or customer-facing copy:

- liability ranking
- liability score
- high liability
- risk worker
- risky worker
- problem worker
- blacklist
- blacklisted
- unsafe person
- bad attitude
- do not use
- poor performer
- unreliable
- undesirable
- troublemaker
- difficult worker
- avoid this worker

These examples are forbidden labels. They may appear only in internal claim-boundary documentation.

## Data Boundary

Review Factors are tenant-scoped and worker-attached in v1. They may include optional placement context:

- site
- client
- role
- job context
- expiry date

They must not store:

- protected-attribute judgements
- medical details
- worker personality labels
- informal blacklist notes
- legal/safety/compliance approval claims

The `medical_clearance_recorded` pattern is deliberately unavailable in v1.

## Categories

Allowed categories:

- `credential_review`
- `site_specific_review`
- `client_specific_review`
- `equipment_familiarity_review`
- `role_experience_review`
- `supervision_required`
- `fatigue_workload_review`
- `recent_incident_review`
- `crew_pairing_review`
- `training_pathway`
- `worker_preference_or_request`
- `operations_manager_review`
- `other_documented_review`

## Severities

- `info`: context only.
- `caution`: visible caution, still allocatable with normal review handling.
- `requires_review`: moves candidate into the Review required group and requires an override reason before allocation.
- `hard_block`: conservative hard block. In v1 it is limited to objective `credential_review`.

## SmartRank Behaviour

SmartRank candidate groups are:

- Top-ranked
- Suitable
- Review required
- Blocked

Review Factors never create an autonomous assignment. The dispatcher still confirms.

If a candidate has a `requires_review` factor, allocation requires an override reason through the existing allocation confirmation flow.

If a candidate has a `hard_block` factor, allocation is rejected. No hard-block override workflow is built in v1.

## Permissions

Existing pilot roles are used:

- `admin`: create, edit, archive, and view Review Factors.
- `supervisor`: create, edit, archive, and view Review Factors.
- `dispatcher`: view Review Factors through SmartRank and worker review context.
- `viewer`: view only where normal tenant pages are visible.

Internal admin tooling is not required for v1.

## Audit Events

Metadata-only audit events are recorded for:

- Review Factor created
- Review Factor updated
- Review Factor archived
- Review Factor applied in a SmartRank run
- Review override recorded
- Review hard-block allocation attempt

Audit payloads should not store sensitive free-text beyond the normal placement review context already visible in the tenant console.

## Future Work Not Built

Do not build yet:

- broad RBAC / IAM
- protected-attribute scoring
- medical-detail tracking
- worker reliability scoring
- worker risk scoring
- payroll or timesheet approval
- automated allocation approval
- SMS / QR / GPS sign-in expansion
- external compliance reports

Future versions may add structured review-before-save workflows, stronger role boundaries, and more precise audit controls after pilot feedback.
