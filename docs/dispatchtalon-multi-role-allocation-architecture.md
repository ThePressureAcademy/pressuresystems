# DispatchTalon Multi-Role Allocation Architecture

## Objective

Support realistic role coverage planning without automatic role collapse. DispatchTalon should suggest where one worker may cover multiple required roles, explain the warning/review basis, and keep the dispatcher as the decision-maker.

## Data Model

New structures:

- `jobs.role_requirements`: JSON snapshot of role slots, counts, separation flags, and notes.
- `job_role_requirements`: normalized job role requirement rows for queryability.
- `role_compatibility_rules`: global defaults and future company overrides.
- `allocation_role_coverages`: confirmed role coverage rows per allocation.

Existing structures preserved:

- `jobs.crew_roles_required` remains backward-compatible.
- `workers.roles` remains the worker role source.
- `credentials` remains the credential source for CredentialGate and role coverage checks.
- Existing allocation, SmartRank, notification, audit, and reset records remain intact.

## Role Compatibility Model

Statuses:

- `compatible`: commonly combinable but still visible as combined-role coverage.
- `review_required`: may be reasonable, but dispatcher review is expected.
- `discouraged`: high-review combination; do not silently collapse.
- `disallowed`: not suggested as a combined-role coverage.

Global Phase 1 defaults:

- Compatible: Dogman + Rigger, Dogman + Truck Driver, Rigger + Truck Driver.
- Review required: Dogman + Electrical Spotter, Rigger + Electrical Spotter, Dogman + EWP Operator, Rigger + EWP Operator, Truck Driver + EWP Operator, Lift Supervisor + Rigger, Lift Supervisor + Truck Driver, Lift Supervisor + Dogman.
- Discouraged: Crane Operator + Dogman, Crane Operator + Rigger, Crane Operator + Electrical Spotter, Crane Operator + Lift Supervisor, Lift Supervisor + Electrical Spotter.

## Headcount Logic

The planner expands job requirements into role slots:

- Dogman x1 becomes one Dogman slot.
- Truck Driver x2 becomes two Truck Driver slots.
- `required_count` creates multiple slots for the same role, so two Truck Driver slots still require two workers.
- `requires_distinct_worker` marks a role that should not be combined with another required role on the same worker.

SmartRank then builds a deterministic coverage plan:

- Apply CredentialGate, availability, schedule, fatigue, and worker status first.
- Evaluate worker role and credential coverage.
- Fill role slots from ranked workers.
- Return conservative headcount and suggested minimum headcount.
- Return unfilled role slots if available workers cannot cover requirements.

Example:

- Job: Truck Driver x2, Dogman x1, Rigger x1.
- Worker A: Truck Driver + Dogman.
- Worker B: Truck Driver + Rigger.
- Conservative headcount: 4 role slots.
- Suggested minimum headcount: 2 workers.

## Allocation Confirmation

When a dispatcher confirms an allocation:

- Client-selected `role_coverage` is validated server-side.
- The worker must belong to the company.
- The job must belong to the company.
- The worker must be eligible for the selected roles.
- Review warnings require `override_reason`.
- Confirmed role coverage is stored in `allocation_role_coverages`.
- The SmartRank snapshot includes role coverage and the coverage plan.

## UI Behaviour

Job Create/Edit:

- Crew role multi-select stays.
- Selected roles expose count fields.
- Selected roles expose "Separate worker only" for roles that should not be combined.
- Optional notes can be added per role.

Job Detail:

- Role requirements display as readable chips with counts and separation flags.
- Allocation cards show assigned role coverage.

SmartRank:

- Shows role coverage suggestion panel.
- Shows conservative vs suggested minimum headcount.
- Shows role coverage per ranked worker.
- Warnings avoid compliance claims.

Allocation Confirmation:

- Dispatcher confirms which role(s) the worker covers.
- Combined-role warnings require review reason.
- Publish allocation SMS uses assigned role coverage, not the whole job role list.

## Audit Policy

Events:

- `role_coverage_suggested`
- `role_coverage_confirmed`
- `role_coverage_review_required`
- `role_coverage_override_recorded`
- `role_compatibility_rule_updated` for future company overrides

Payloads include job ID, worker ID, roles covered, review flag, and reason. Payloads do not claim safety/compliance approval.

## Future Company Configuration

Future versions can expose company-specific compatibility overrides in Our Business:

- allow
- review required
- discourage
- disallow

This release seeds global defaults and stores company override capability in the data model, but does not build the full configuration UI.

## Boundary

DispatchTalon provides allocation decision support. It does not certify role legality, worker competence, site suitability, road access, lift engineering, permit status, award interpretation, payroll, or compliance.
