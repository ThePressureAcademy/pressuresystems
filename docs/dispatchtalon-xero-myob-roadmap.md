# DispatchTalon Xero/MYOB Roadmap

## Product boundary

DispatchTalon is not payroll software, invoicing software, tax software, award-interpretation software, or certified accounting middleware.

The current direction is export-first accounting handoff:

- CSV export for office review
- spreadsheet/accounting import compatibility later
- accounting-system mapping after the schema is proven
- direct API integration only after commercial, legal, and support review

## Phase 1: CSV export

Status: current implementation target.

DispatchTalon exports:

- workers
- jobs
- allocations
- payroll-prep
- invoice-prep
- audit
- metrics

No Xero or MYOB credentials are stored.

No OAuth accounting connection is created.

No automatic accounting-system posting occurs.

## Phase 2: Template mapping

Map DispatchTalon export columns to accounting or spreadsheet import templates where the customer already has a manual import workflow.

Examples:

- payroll-prep to internal payroll review sheet
- invoice-prep to office invoicing sheet
- allocation export to operations review workbook

## Phase 3: Customer-specific field mapping

Add configurable mapping only after repeated export use shows stable fields.

Likely future fields:

- payroll employee ID
- accounting contact/customer ID
- cost centre
- item code
- activity code
- asset/fleet code
- approved actual hours
- export batch ID

## Phase 4: OAuth/API proof of concept

Only after Phase 1 to 3 are proven:

- evaluate Xero/MYOB API scopes
- evaluate customer permission model
- define credential storage/security
- define support ownership
- define rollback and reconciliation workflow
- run a limited proof of concept

## Phase 5: Production integration

Production direct integration requires:

- legal/commercial review
- support model
- customer consent
- secure credential handling
- reconciliation tools
- clear liability boundaries
- vendor certification review if claims will be made

## Current claim boundary

Allowed language:

- CSV export for office review and accounting handoff
- export-ready operational data
- payroll-prep CSV
- invoice-prep CSV
- Xero/MYOB mapping can be assessed after the export schema is proven

Not claimed:

- Xero integrated
- MYOB integrated
- automatic payroll
- automatic invoicing
- payroll-ready
- tax compliant
- certified accounting integration
- automatic award interpretation
