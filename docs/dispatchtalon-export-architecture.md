# DispatchTalon Export Architecture

## Why CSV first

DispatchTalon should support office, payroll-prep, invoicing-prep, and management review workflows through clean CSV exports before any direct accounting API integration.

CSV first is the lower-risk commercial and engineering path because it:

- gives office/admin staff useful data immediately
- keeps humans in the review loop
- avoids premature accounting API credentials and OAuth complexity
- avoids unsupported payroll, tax, award, and invoice claims
- lets the export schema prove itself before mapping into Xero, MYOB, or another system

## Export types

### Worker export

Filename: `dispatchtalon-workers-export-YYYY-MM-DD.csv`

Purpose: workforce/admin review.

### Job export

Filename: `dispatchtalon-jobs-export-YYYY-MM-DD.csv`

Purpose: job and office handoff review.

### Allocation export

Filename: `dispatchtalon-allocations-export-YYYY-MM-DD.csv`

Purpose: who was allocated to what.

### Payroll-prep export

Filename: `dispatchtalon-payroll-prep-export-YYYY-MM-DD.csv`

Purpose: office review before payroll system entry.

Boundary: scheduled allocation data only. No payroll calculation.

### Invoice-prep export

Filename: `dispatchtalon-invoice-prep-export-YYYY-MM-DD.csv`

Purpose: office review before invoicing.

Boundary: job/activity data only. No invoice totals.

### Audit export

Filename: `dispatchtalon-audit-export-YYYY-MM-DD.csv`

Purpose: decision-trail export without raw audit payloads.

### Metrics export

Filename: `dispatchtalon-metrics-export-YYYY-MM-DD.csv`

Purpose: pilot and management review.

## API endpoints

- `GET /api/exports/workers.csv`
- `GET /api/exports/jobs.csv`
- `GET /api/exports/allocations.csv`
- `GET /api/exports/payroll-prep.csv`
- `GET /api/exports/invoice-prep.csv`
- `GET /api/exports/audit.csv`
- `GET /api/exports/metrics.csv`

Supported query parameters:

- `start_date`
- `end_date`
- `timezone`
- `include_archived`
- `job_id`
- `worker_id`

## Tenant isolation

All endpoints require authentication and use the authenticated user company ID. Client-supplied company IDs are not accepted.

The existing password-rotation gate applies because the endpoints use the standard `requireAuth` middleware.

## CSV safety

CSV cells are escaped with stable headers. Cells beginning with `=`, `+`, `-`, or `@` after leading whitespace are prefixed with an apostrophe to reduce spreadsheet formula injection risk.

## Payroll and invoice boundary

DispatchTalon exports operational data for review. It does not calculate:

- payroll
- tax
- super
- award rates
- allowances
- overtime
- entitlements
- invoice totals
- GST treatment

## Xero/MYOB future mapping

Direct Xero/MYOB integration is future roadmap work and not part of this phase.

The staged path is:

1. Stable CSV exports.
2. Spreadsheet/import template mapping.
3. Customer-specific field mapping.
4. OAuth/API proof of concept.
5. Production/certified integration only after legal, commercial, and support review.
