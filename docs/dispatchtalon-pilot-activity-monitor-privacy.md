# DispatchTalon Pilot Activity Monitor Privacy

The internal pilot monitor tracks usage signals and aggregate adoption metrics. It does not expose worker names, job addresses, client names, job descriptions, or private operational notes.

## Purpose

The monitor exists for Pressure Systems internal pilot support. It helps identify whether pilot companies are logging in, setting up their workspace, creating/importing workers and jobs, running SmartRank, and reaching friction points during the pilot window.

It is not a customer-facing feature and it is not a job-content viewer.

## What It Shows

- Company display name and slug
- Pilot type, access status, expiry date, and days remaining
- User count
- Last login time and last activity time
- Active days count
- Aggregate counts for workers, jobs, assets, imports, edits, SmartRank runs, resets, audit events, warnings, and blocks
- Last activity type as an event category only
- Engagement score
- Adoption stage
- Follow-up recommendation

## What It Deliberately Does Not Show

- Worker names, emails, or phone numbers
- Job names, descriptions, or private job notes
- Client names
- Site names, site addresses, or site locations
- Contact names or phone numbers
- Exact credential documents or attachments
- Uploaded job brief text
- Raw audit payloads
- Free-text operational notes

## Privacy Rationale

Pilot support needs adoption signals, not sensitive operational content. The monitor reads event categories, timestamps, company identifiers, and aggregate row counts. It does not expose operational records or audit payload details.

This keeps the founder/admin view useful for retention while respecting the trust boundary around job, worker, client, contact, and location data.

## Access Boundary

The monitor requires normal authentication plus the internal-admin flag on the authenticated user. Company admins, dispatchers, supervisors, and viewers cannot access the internal endpoint or see the monitor navigation item.

API access is rejected for unauthenticated users and non-internal users.

## Data Minimisation

The monitor intentionally returns only the fields required to answer:

- Did the company activate?
- Are they using core workflows?
- Where are they likely stuck?
- Is a follow-up needed before the pilot window closes?

It avoids names, addresses, free text, and raw payloads because those fields are not required for pilot retention decisions.
