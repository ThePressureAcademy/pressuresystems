# DispatchTalon Office Admin Export Guide

## What exports are for

DispatchTalon exports operational data so office/admin staff can review dispatch activity before entering or uploading information into their normal business systems.

Exports are a handoff workflow, not an automatic accounting workflow.

## How to download

1. Sign in to the DispatchTalon console.
2. Open `Reports & Exports`.
3. Set optional date filters.
4. Choose the relevant CSV:
   - Workers CSV
   - Jobs CSV
   - Allocation CSV
   - Payroll-prep CSV
   - Invoice-prep CSV
   - Audit CSV
   - Metrics CSV
5. Open the CSV in a spreadsheet tool for review.

## Before using payroll-prep exports

Confirm:

- worker name and ID
- job and site
- scheduled start and end
- scheduled hours
- role
- notes

Do not assume:

- actual hours were worked
- breaks were approved
- overtime was calculated
- award rates were interpreted
- allowances were calculated
- tax, super, or entitlements were calculated

## Before using invoice-prep exports

Confirm:

- job/client/site details
- scheduled window
- allocated workers
- selected equipment or asset numbers
- internal notes

Do not assume:

- invoice totals were calculated
- rates were applied
- GST was calculated
- purchase order rules were checked
- invoice approval has been completed

## Safe spreadsheet handling

DispatchTalon neutralises common spreadsheet formula-leading cells in CSV output, but office staff should still review exports before upload or accounting entry.

Do not import an export into another system without checking the rows first.

## Privacy and access

Exports can contain operational and personal information such as worker names, contact details, client names, sites, and allocation history.

Only authorised company users should download or handle these files.

## Current boundary

DispatchTalon currently provides CSV export for office review and accounting handoff.

Direct Xero/MYOB integration is future work and not part of the current export phase.
