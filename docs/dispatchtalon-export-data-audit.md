# DispatchTalon Export Data Audit

## Purpose

This audit records what DispatchTalon can export today without direct Xero, MYOB, payroll, invoicing, or accounting API integration.

DispatchTalon remains an operational dispatch system. The export layer is for office review, spreadsheet workflows, and accounting handoff.

## Available exportable fields

### Workers

- Worker ID
- Worker name
- Email
- Phone/contact number
- Roles
- Status
- Credentials and expiry/status summary
- Created timestamp
- Updated timestamp

Readiness: export-ready for workforce/admin review.

Privacy risk: contains personal worker contact details. Access must remain authenticated and tenant-scoped.

### Jobs

- Job ID
- Job title/reference fallback
- Client
- Site
- Location
- Job date
- Scheduled start/end
- Timezone
- Required crew roles
- Required credentials
- Equipment and asset requirements
- Site conditions
- Additional operational notes
- Created timestamp

Readiness: export-ready for job/admin handoff.

Privacy risk: contains client/site/location/notes. Access must remain authenticated and tenant-scoped.

### Allocations

- Allocation ID
- Job ID and title
- Worker ID and name
- Role
- Allocation status
- Publish status
- Override reason
- Scheduled start/end
- Timezone
- Created timestamp

Readiness: export-ready for allocation review.

Privacy risk: connects workers to jobs. Access must remain authenticated and tenant-scoped.

### Payroll-prep

- Worker
- Job
- Site
- Scheduled start/end
- Total scheduled hours
- Role
- Notes
- Export warning

Readiness: suitable for office review before payroll entry.

Missing for payroll calculation: actual hours, breaks, allowances, overtime rules, award interpretation, tax, super, leave, and payroll approval workflow.

### Invoice-prep

- Job
- Client
- Site
- Scheduled window
- Allocated workers
- Selected equipment/assets
- Asset number
- Notes
- Export warning

Readiness: suitable for office review before invoicing.

Missing for invoicing: rates, charge rules, invoice line mapping, tax/GST treatment, purchase orders, and accounting approval workflow.

### Audit

- Event ID
- Event type
- Job/worker/user references
- Event time
- Safe summary

Readiness: export-ready as a decision trail.

Privacy risk: raw payloads can contain sensitive operational detail. Export intentionally excludes raw payloads.

### Metrics

- Period
- Jobs created
- Workers added
- Allocations confirmed
- Warnings
- Blocks
- Overrides
- Manual notifications published

Readiness: export-ready for pilot and management review.

## Missing fields for future accounting workflows

- Customer/accounting contact mapping
- Payroll employee IDs
- Accounting item codes
- Cost centres
- Rate cards
- Award/EA classification data
- Approved actual hours
- Allowances
- Overtime review
- Invoice line item templates
- Export approval state
- Export batch history

## Governance conclusion

CSV export is the correct first phase. It provides useful office handoff data without pretending DispatchTalon is payroll, tax, invoicing, or certified accounting software.
