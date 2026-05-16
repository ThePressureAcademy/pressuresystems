# DispatchTalon Role Coverage Examples

## Dogman + Rigger

Possible when the worker has both roles and the required dogging/rigging credentials are recorded.

System behaviour:

- Suggest combined coverage.
- Show multi-role review warning.
- Require dispatcher confirmation if warnings exist.

## Dogman + Truck Driver

Possible where timing allows the same worker to transport and then perform dogging duties.

System behaviour:

- Suggest combined coverage when the worker has Dogman, Truck Driver, DG, and a heavy vehicle credential.
- Reduce suggested minimum headcount from two role slots to one worker.
- Keep review wording visible.

## Rigger + Truck Driver

Possible where the worker can drive and perform rigging duties without timing conflict.

System behaviour:

- Suggest combined coverage if the worker has rigging and heavy vehicle credentials.
- Add review context if multiple roles are covered.

## Dogman + Electrical Spotter

Possible only as review-gated decision support where the electrical spotter credential is recorded.

System behaviour:

- Allow suggestion if credentialed.
- Warn that site/company procedure must be checked.
- Do not claim the combined role is safe or compliant.

## Rigger + EWP Operator

Possible where the worker has rigging role/credential and EWP capability, and where the job sequence supports it.

System behaviour:

- Require WP or VOC WP credential to suggest EWP Operator coverage.
- Warn that timing and plant use must be reviewed.

## Lift Supervisor + Rigger

Possible with review, but supervision independence may matter.

System behaviour:

- Suggest possible coverage when worker profile supports both roles.
- Add review warning.
- Require dispatcher reason if confirming allocation with active warning.

## Two Truck Drivers Also Covering Dogman/Rigger Roles

Job:

- Truck Driver x2
- Dogman x1
- Rigger x1

Workers:

- Mason: Truck Driver + Dogman
- Noah: Truck Driver + Rigger

Expected plan:

- Conservative headcount: 4 role slots.
- Suggested minimum headcount: 2 workers.
- Mason covers Truck Driver + Dogman.
- Noah covers Truck Driver + Rigger.

Boundary:

- Truck Driver x2 still requires two distinct truck driver slots.
- The additional Dogman/Rigger duties are suggested only if credentials, timing, fatigue, schedule, and site context allow.

## Crane Operator + Dogman

High-review/discouraged combination.

System behaviour:

- Do not silently collapse.
- Show discouraged/review warning.
- Do not hard-block solely because the combination is unusual unless policy marks it disallowed.
- Still hard-block if credentials, availability, schedule, or fatigue fail.

## When To Keep Roles Separate

Keep roles separate when:

- Multiple workers are explicitly required for the same role count.
- Site/client/company procedure requires separation.
- The roles require simultaneous duties in separate locations.
- A supervisor role should be independent for the job.
- Crane operation is proposed to combine with active lift support roles.
- Heavy vehicle fatigue/work-rest context makes combined driving and site duties unsuitable.

## Dispatcher Confirmation

Every combined-role allocation remains a dispatcher decision. DispatchTalon records the suggested coverage, warnings, confirmed role coverage, and review reason so the decision trail is visible later.
