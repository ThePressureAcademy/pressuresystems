# DispatchTalon Clean Tenant Data Audit

Date: 2026-05-14

## Executive Verdict

New pilot tenants must start with clean operational data and build their own company setup. The audit found no committed seed path that automatically creates production workers, jobs, worker credentials, fatigue records, allocations, job imports, or company assets for new tenants.

The main cleanliness issue was catalogue behavior: fresh companies were being shown recommended requirement items as enabled selections before an admin had saved the company setup. This has been corrected so recommendations remain visible guidance, but no company catalogue selections are saved or treated as enabled until the user saves Build My Business setup.

## Sources Inspected

- `backend/src/schema.sql`
- `backend/src/db.js`
- `backend/src/seed.js`
- `backend/src/scripts/provision-pilot-tenants.js`
- `backend/src/scripts/seed-requirement-catalogue.js`
- `backend/src/services/job-requirement-catalogue.js`
- `backend/src/services/company-assets.js`
- `backend/src/routes/company-catalogue.js`
- `backend/src/routes/workers.js`
- `backend/src/routes/jobs.js`
- `backend/src/routes/auth.js`
- `backend/public/console/app.js`
- `backend/public/console/index.html`
- `backend/tests/*.test.js`
- `backend/samples/*`

## Default Data Classification

### A. Allowed Global Reference Data

- Requirement catalogue items seeded by `backend/src/services/job-requirement-catalogue.js`.
- Crane model catalogue and travel states seeded by `backend/src/services/crane-model-catalog.js`.
- Static sample files under `backend/samples/` for manual import examples.

These are shared reference options and do not create tenant operational data.

### B. Allowed Demo / Sample Data

- Sample employee import CSV/TSV files under `backend/samples/`.
- Sample job brief `.txt` and `.md` files under `backend/samples/`.

No committed `backend/src/scripts/seed-demo-dataset.js` file exists in this branch. If a dedicated demo tenant seed script is added later, it must write only to a clearly marked demo tenant and must not seed pilot/production tenants.

### C. Not Allowed In Production / Pilot Tenants

The following must not be auto-created for a fresh company:

- Workers
- Jobs
- Worker credentials
- Fatigue records
- Company assets
- Allocations
- Job imports
- Job requirement rows
- Saved company catalogue selections

Tests now assert provisioned pilot tenants start with zero rows in these operational tables.

### D. Allowed System / Admin Data

- Company row.
- Admin user row.
- `must_change_password = 1` for provisioned pilot admins.
- Password hash only, never plaintext.

## Findings

### Finding 1: Recommendations Were Acting Like Enabled Defaults

`listCompanyCatalogueSelections()` previously returned recommended catalogue items as `is_enabled: true` when a company had not saved any selections.

Risk:

- Fresh tenants appeared partially configured before setup.
- Job forms could show default requirement stacks as if they belonged to that company.
- Asset register could appear ready for asset entry before equipment/transport classes were explicitly selected.

Action taken:

- Fresh companies now return `configured: false`, `enabled_count: 0`, and `is_enabled: false` for all catalogue items.
- Recommended items remain visible via `recommended_default: true`.
- `requires_setup: true` and `recommended_count` are returned for UI guidance.

### Finding 2: Asset Creation Did Not Require A Saved Company Class Selection

Asset creation already rejected non-equipment and non-transport catalogue items, but it did not require the equipment/transport class to be enabled in the company catalogue.

Risk:

- A plant number could be created under a class the company had not selected.
- Asset register cleanliness could drift away from Build My Business setup.

Action taken:

- New asset creation now requires Plant + labour operating mode.
- New asset creation now requires the equipment/transport class to be enabled in Our Business.
- Credentials, VOCs, rail, energy, and civil/access items remain invalid asset classes.

### Finding 3: Console Empty States Still Referenced Sample-Oriented Onboarding

Some zero-state copy made a fresh tenant feel demo/sample-led rather than business-led.

Action taken:

- Dashboard now shows a Build My Business first-run panel.
- Workers, jobs, assets, job requirements, and metrics zero-state copy now points to company setup, import, and real data creation.
- Asset register now tells plant + labour users to select equipment or transport classes before adding plant numbers.

### Finding 4: Live Cleanup Needs A Dry-Run Gate

No automatic deletion should run against live tenant data.

Action taken:

- Added `backend/src/scripts/clean-non-demo-sample-data.js`.
- Dry-run is the default.
- Apply mode requires `--apply`.
- The script only targets clearly marked sample/smoke data outside demo tenants.
- It cancels sample jobs and archives sample workers only when apply mode is explicitly used.

## New Tenant Clean-State Acceptance

A newly provisioned company now starts with:

- Company exists.
- Admin user exists.
- Admin can be forced to rotate password.
- Zero workers.
- Zero jobs.
- Zero worker credentials.
- Zero fatigue records.
- Zero company assets.
- Zero allocations.
- Zero job imports.
- Zero saved company catalogue selections.
- Global requirement catalogue available.
- Global crane model catalogue available.
- Build My Business setup available from the dashboard.

## Build My Business Architecture

First-run flow now guides the company through:

- Choose operating mode.
- Select relevant requirement catalogue items.
- Add/import workers.
- Add assets only for Plant + labour mode after equipment/transport classes are selected.
- Create or import the first job.
- Review setup progress through counts.

This is guidance, not a forced blocking wizard.

## Asset Registry Rules

Asset register rules now enforce:

- Asset creation is available only in Plant + labour mode.
- Assets require a selected equipment or transport catalogue item.
- Asset number / plant number is required.
- Multiple assets under the same class are allowed.
- Non-asset categories cannot be registered as assets.
- Existing disabled-class assets can still be listed with warnings rather than silently deleted.

## Demo Isolation

No demo dataset script is currently committed. Existing sample files remain static import examples only.

If live non-demo sample rows are suspected, use:

```powershell
node backend/src/scripts/clean-non-demo-sample-data.js
```

Apply mode must only be used after reviewing dry-run output:

```powershell
node backend/src/scripts/clean-non-demo-sample-data.js --apply
```

## Validation

Executed with Node 20:

```powershell
$env:PATH = "C:\Users\raymo\Desktop\THE PRESSURE ACADEMY - COMPLETE\tmp\node20\node-v20.20.2-win-x64;$env:PATH"
$tests = Get-ChildItem -Path .\tests -Filter *.test.js | ForEach-Object { $_.FullName }
node --test $tests
```

Result:

- 172 tests passing.

## Known Limitations

- This pass does not delete existing live customer data.
- Live cleanup outside demo tenants requires explicit dry-run review and `--apply`.
- Asset register remains lightweight and is not full fleet management.
- Demo content remains available as static sample files and future demo seed work must stay demo-tenant scoped.
