# LIFTIQ Demo Data Notes

Dataset version: `2026-05-liftiq-demo-v1`

Demo tenant:

- Slug: `liftiq-demo-internal`
- Display name: `LIFTIQ Demo / Internal`
- Purpose: screen-recording and founding-partner demonstrations only
- Data: synthetic workers, synthetic jobs, fake emails, fake phone numbers, and synthetic audit activity

## Seed Commands

Dry run:

```powershell
cd C:\Users\raymo\OneDrive\Documents\GitHub\pressuresystems\backend
node src/scripts/seed-demo-dataset.js --dry-run
```

Local/live run after `LIFTIQ_DEMO_EMAIL` and `LIFTIQ_DEMO_PASSWORD` are available in the target environment:

```powershell
cd C:\Users\raymo\OneDrive\Documents\GitHub\pressuresystems\backend
node src/scripts/seed-demo-dataset.js
```

Fly run after this script is deployed:

```powershell
fly ssh console -a liftiq-pilot -C "sh -lc 'cd /app && node src/scripts/seed-demo-dataset.js'"
```

The script does not print the demo password. Admin email output is masked.

## What The Seeder Does

- Finds or creates the `liftiq-demo-internal` company.
- Creates or updates the demo admin from `LIFTIQ_DEMO_EMAIL` and `LIFTIQ_DEMO_PASSWORD`.
- Sets `must_change_password = 1` for the demo admin.
- Cancels or deletes only smoke/test jobs inside the demo tenant.
- Creates or updates 10 synthetic workers.
- Creates or updates credentials, fatigue records, and task preferences.
- Creates or updates 16 synthetic upcoming jobs from 18 May 2026 to 12 June 2026.
- Creates crane/counterweight/transport planning records for counterweight-review jobs.
- Seeds audit and metrics activity without touching other tenants.

## Best Demo Workers

| Worker | Use for | Notes |
| --- | --- | --- |
| Tom Mercer | Clean Franna ranking and schedule conflict | Allocated to `Brisbane Rooftop Plant Lift`; conflict with `Schedule Conflict Test Lift`. |
| Riley Hayes | GMK5150L and counterweight preference | Strong counterweight and all-terrain crane profile. |
| Sam Fletcher | Dogman/precast work | Good for crew-role and credential examples. |
| Blake Warren | Fatigue block and shutdown rigging | High weekly fatigue load. |
| Connor Vale | Supervisor and availability warning | Status is `allocated`. |
| Nathan Brooks | Availability hard block | Status is `unavailable`. |
| Isaac Nolan | Credential and rest block | Missing dogging credential and has short rest example. |
| Jordan Ellis | Fatigue warning | High weekly hours but intended as a warning scenario. |
| Aaron Miles | Transport/access support | Existing role model uses `traffic_controller` with transport-support notes. |
| Daniel Fraser | Dispatch/audit walkthrough | Allocator profile. |

## Best Demo Jobs

| Job | Demonstrates |
| --- | --- |
| Brisbane Rooftop Plant Lift | Job Brief Import style fields, schedule, clean job detail. |
| Eagle Farm Container Repositioning | Clean SmartRank ranking. |
| Ipswich Transformer Placement | CredentialGate hard-block opportunity. |
| Night Shift Shutdown Rigging Support | FatigueGuard warning/block opportunity. |
| Pinkenba Counterweight Transport Lift | GMK5150L 24.0t travel state vs 44.5t required counterweight. |
| Port Access Mobile Crane Job | GMK5150L-1 30.9t distinction and road-access/NHVR review flags. |
| Schedule Conflict Test Lift | Schedule conflict against existing Tom Mercer allocation. |
| Hemmant Shutdown Pump Changeout | Task preference and shutdown context. |

## Playwright Screenshot Command

```powershell
cd C:\Users\raymo\OneDrive\Documents\GitHub\pressuresystems-liftiq-demo-content-system\content\liftiq-demo\automation

$env:LIFTIQ_PORTAL_URL = "https://liftiq-pilot.fly.dev/console/"
$env:LIFTIQ_DEMO_EMAIL = "<demo email from secret>"
$env:LIFTIQ_DEMO_PASSWORD = "<demo password from secret>"

npm run screenshots
```

Do not commit, paste, or print the password.
