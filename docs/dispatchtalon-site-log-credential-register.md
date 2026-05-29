# DispatchTalon Daily Site Log and Credential Register

## Purpose

This pilot feature responds to operator feedback asking for a practical staff diary: who was onsite, when they signed in, when they signed out, which job/site they were attached to, and whether the daily record can be printed later.

The feature is intended to extend DispatchTalon from allocation visibility into a reviewable operational record without turning the pilot into payroll, legal attendance, compliance certification, or automated dispatch.

## Pilot Feedback Source

Pilot users asked for:

- Daily report logs that can be printed.
- A simple sign in / sign out flow for workers each day.
- A staff diary that can show who was onsite at a given date or time.
- Editable credential and licence types for region-specific requirements such as NZ SiteSafe.
- Worker-specific credential cards and an active register.

## What Was Built

- Daily Site Log console section.
- Site/job/date filters for historical onsite lookup.
- Worker rows with scheduled, signed in, signed out, absent, removed, and manual entry states.
- Sign in and sign out actions with audit events.
- Print-friendly Daily Site Log report.
- Tenant-specific editable credential types.
- Worker credential register support for custom credential types, numbers, issuing body, issue/expiry dates, notes, active state, and review status.

## Operational Boundary

The Daily Site Log is an operational record for pilot review. It is not a payroll timesheet, wage approval flow, legal attendance record, certified site log, safety approval system, or automatic compliance tool.

The Worker Credential Register is a visibility and review tool. It records credential information and expiry status so dispatch teams can review what is current, expiring soon, expired, missing, or needing confirmation. It does not approve compliance or replace professional, client, site, legal, safety, or engineering judgement.

Daily reports include the boundary:

> Generated from DispatchTalon pilot records. Review before operational use.

## Privacy Notes

- Site logs, site log entries, credential types, and worker credentials are tenant-scoped.
- Historical logs use worker and asset name snapshots where useful so old records remain understandable if source records change.
- No credential file attachments were added in this sprint.
- No GPS, biometric, SMS, QR, payroll, wage, client-facing, or automatic approval workflow was added.
- Audit events record key sign in, sign out, entry update, entry removal, credential type, and credential register changes.

## Credential Type Rules

- Default credential types remain available.
- Tenant users with the right role can add business-specific credential types.
- Custom credential types are scoped to the company tenant.
- Archived custom credential types stop appearing in new worker credential selections.
- Credential lists use factual operational language: required, current, expired, expiring soon, needs confirmation, custom credential type, tenant credential type, and business-specific credential.
- Credential listings must not call credentials "recommended".

## Future Roadmap Not Built

- Payroll or timesheet export.
- Advanced PDF generation beyond browser print.
- Credential file upload attachment.
- AI-assisted credential extraction.
- SMS sign-in links.
- QR site sign-in.
- GPS or location verification.
- Client-facing daily reports.
- Supervisor approval workflows.
- Review-before-save extraction from uploaded documents.

## Release Notes

This is a pilot feature branch and should go through review before production deployment. Live smoke should confirm:

- Daily Site Log loads.
- A worker can be added to a log.
- Sign in and sign out actions work.
- Print view is readable.
- Historical filters work.
- Custom credential type such as NZ SiteSafe can be created.
- The custom type appears in the worker credential form.
- Expired and expiring credential states are visible.
- No unsupported payroll, compliance, legal, safety, or autonomous-dispatch claim appears.
