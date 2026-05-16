# DispatchTalon Multi-Role Allocation Analysis

## Purpose

DispatchTalon needs to avoid over-allocating separate workers when a competent, credentialed worker may reasonably cover more than one required role. It also needs to avoid under-allocation where the job, site, client, law, company procedure, schedule, fatigue context, or role independence requires separate people.

This analysis supports product rules only. It is not legal advice, safety advice, permit approval, lift engineering, or a compliance determination.

## Public Research Basis

- Safe Work Australia states that high risk work includes dogging and rigging work, operating certain cranes and hoists, forklifts, reach stackers, and boom-type EWPs over 11 metres, and that workers must hold the right high risk work licence for the work they perform.
- WorkSafe Queensland describes dogging work as slinging techniques or helping a plant operator move a load when it is outside the operator's view, and maintains separate dogger and rigger licence information.
- WorkSafe Queensland also notes that some former machinery licence categories, including excavator, front-end loader, skid steer loader, road roller and grader, are no longer licence classes, while still requiring training, instruction, supervision, and safe systems of work.
- WorkSafe Queensland identifies crane/EWP high risk licence classes such as CN, C2, C6, C1, C0 and WP in plant contexts.
- NHVR fatigue guidance treats heavy vehicle work/rest obligations as a distinct constraint for fatigue-regulated heavy vehicle drivers.

Sources:
- https://www.safeworkaustralia.gov.au/safety-topic/managing-health-and-safety/licences
- https://www.worksafe.qld.gov.au/licensing-and-registrations/work-health-and-safety-licences/what-licence-do-i-need/rigger-and-dogger
- https://www.worksafe.qld.gov.au/licensing-and-registrations/work-health-and-safety-licences/when-dont-i-need-a-licence
- https://www.nhvr.gov.au/safety-accreditation-compliance/fatigue-management/counting-time/definition-of-work-and-work-time
- https://www.nhvr.gov.au/safety-accreditation-compliance/fatigue-management/work-and-rest-requirements

## Why Multi-Role Allocation Matters

Crane, rigging, labour hire, transport, and plant operations often use multi-skilled workers. A worker may have the profile, licence, VOC, and company knowledge to cover more than one role on the same job. If DispatchTalon treats every required role as a separate person, it can inflate crew recommendations and make the system feel unrealistic.

The opposite risk is more serious: collapsing roles too aggressively can under-resource a job. DispatchTalon must therefore suggest coverage, not decide it.

## Common Role-Combination Examples

- Dogman + Rigger.
- Dogman + Truck Driver.
- Rigger + Truck Driver.
- Dogman + Electrical Spotter, if credentialed and site procedure allows.
- Rigger + Electrical Spotter, if credentialed and site procedure allows.
- Dogman + EWP Operator, if credentialed and timing allows.
- Rigger + EWP Operator, if credentialed and timing allows.
- Lift Supervisor + Rigger, review required.
- Lift Supervisor + Truck Driver, review required.
- Two truck drivers also covering Dogman/Rigger duties where timing and job sequence allow.

## When Combined Roles May Be Reasonable

Combined-role coverage may be reasonable when:

- The worker profile includes each role.
- The required credential/licence/VOC is recorded.
- The job timing does not require simultaneous physical presence in separate places.
- The worker is available and not hard-blocked by schedule overlap.
- FatigueGuard does not hard-block the allocation.
- The job brief or dispatcher notes imply a combined role, such as Dogman/Rigger.
- No company/client/site rule requires separation.
- The dispatcher records a review reason where warnings exist.

## When Roles Should Remain Separate

Roles should remain separate, or at least be high-review, when:

- The worker lacks a required credential/licence/VOC.
- The worker is unavailable, hard schedule-blocked, or fatigue hard-blocked.
- The job requires two workers for the same role slot, such as two truck drivers.
- One role requires continuous observation while another requires active plant operation.
- A supervisor role should remain independent for this job.
- Crane operator is proposed to combine with Dogman, Rigger, Electrical Spotter, or Lift Supervisor.
- Site, client, project, company, or legal requirements mandate separation.

## Credentials Required by Role

The Phase 1 model checks role-specific credentials where DispatchTalon can do so from recorded worker data:

- Dogman: DG or legacy dogging credential.
- Rigger: RB, RI, RA, or legacy rigging credential.
- Crane Operator: crane HRWL alternatives such as C0, C1, C2, C6, CN, CB, CD, CP, CV, or legacy crane credential.
- Truck Driver: heavy vehicle MC, HC, HR, or driver licence record.
- Electrical Spotter: electrical spotter credential.
- EWP Operator: WP or VOC WP.
- Forklift Operator: LF or forklift machinery credential.

Credential matching is a decision-support check only. It does not certify legal entitlement or site suitability.

## Scheduling and Fatigue

Multi-role coverage should never bypass schedule and fatigue gates:

- Confirmed overlapping allocation windows remain hard blocks.
- Planned overlaps remain warnings.
- Fatigue hard blocks remain hard blocks.
- Additional travel over 100km remains review context.
- Heavy vehicle driver fatigue/work-rest requirements should be considered by the dispatcher before confirming truck driver coverage.

## Product Rules Recommended

- Keep existing worker/job role multi-selects.
- Add role requirement counts.
- Add "must be separate person" on job role slots.
- Add global default compatibility rules.
- Store role coverage per allocation.
- Show suggested minimum headcount and conservative headcount.
- Record audit events when role coverage is suggested, confirmed, review-required, or overridden.
- Require dispatcher override reason when combined-role coverage carries warnings.
- Use neutral wording: "review required", "confirm suitability", "dispatcher confirmation required".

## Legal and Compliance Boundary

DispatchTalon can structure the allocation decision and preserve the reasoning. It does not approve a worker to perform combined duties, does not certify compliance, does not approve permits, does not engineer lifts, and does not replace company/site/client/legal review.

The dispatcher remains responsible for confirming whether combined-role coverage is suitable for the job, site, client, applicable law, and company procedure.
