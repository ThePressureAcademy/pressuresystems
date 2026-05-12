# LIFTIQ Demo Dataset Research Summary

Capture date: 2026-05-12

Purpose: create realistic but fully synthetic LIFTIQ demo data for screen recording, founding-partner walkthroughs, and grant/funding evidence. No customer names, employee names, private job notes, phone numbers, credentials, or operational tenant data were copied.

## Sources Reviewed

| Source | URL | Pattern extracted | How it was used |
| --- | --- | --- | --- |
| Premier Cranes price estimate page | https://www.premiercranes.com.au/price-estimate | Crane hire enquiries commonly require location, lift object, access, timing, and service context. | Used to shape generic job-intake fields and quote-style demo briefs. |
| Universal Cranes about page | https://universalcranes.com/about-universal-cranes/ | Crane hire work spans mobile cranes, all-terrain cranes, crawler cranes, lifting, and rigging. | Used to keep demo job categories grounded in Australian crane-hire service patterns. |
| Freo Group crane hire and logistics pages | https://freogroup.com.au/ | Heavy lift providers commonly combine crane hire, rigging, transport logistics, shutdown, and project support. | Used to include crane/rigging/transport combinations rather than single isolated lifts only. |
| Tutt Bryant Heavy Lift & Shift | https://tuttbryant.com.au/division/heavy-lift-shift/ | Australian heavy lift services include crane hire, heavy lifting, specialised transport, and project services. | Used to include mixed crane classes, specialised transport, and industrial site contexts. |
| Joyce Krane public services summary | https://joycekrane.com/ | Public crane-hire service positioning covers heavy lift, wet hire, dry hire, engineering support, major projects, construction, infrastructure, logistics, maritime, mining, oil and gas, renewable energy, and residential sectors. | Used to include machinery relocation, civil/bridge, maritime/port, and restricted-access scopes. |
| Smithbridge Group public capability | https://www.smithbridgegroup.com/ | Public business-level examples show crane hire, craneage, heavy lift, transport, civil, marine, and precast contexts through Smithbridge and Universal Cranes. | Used only for broad job-type realism, not tenant data. |

## Job Patterns Extracted

- Rooftop mechanical plant lifts commonly need site access notes, lift timing, crane class, dogman/rigger roles, and credential checks.
- Precast and construction lifts commonly need crane operator, dogman, rigger, supervisor, critical-lift review notes, and schedule windows.
- Shutdown maintenance lifts commonly need early starts or night work, compressed windows, fatigue review, and rigging crew coverage.
- Machinery relocation and warehouse installs commonly need Franna/pick-and-carry, riggers, access-path notes, forklift/EWP context, and travel/mobilisation.
- Port, bridge, wharf, CBD, and restricted-access work commonly needs transport/access review language, traffic/access support, and road-access review flags.
- All-terrain crane counterweight examples need exact crane model, travel state, counterweight required, carried counterweight, support transport, and review-only road/NHVR prompts.

## Fields Used In Demo Jobs

- `client_name`
- `site_name`
- `site_location`
- `contact_name`
- `contact_phone`
- `date`
- `shift_start_time`
- `scheduled_end_time`
- `job_timezone`
- `crane_class_required`
- `crew_roles_required`
- `required_credentials`
- `task_tags`
- `risk_notes`
- `travel_notes`
- `source_note`
- crane model, travel state, counterweight required, support transport review fields where relevant

## What Was Intentionally Not Copied

- No customer names.
- No employee names from public company websites.
- No real phone numbers.
- No real project names or site notes.
- No private tender, quote, permit, route, or operational details.
- No claim that sample jobs are real.
- No compliance, permit approval, road legality, WHS guarantee, or engineered lift claim.

## Privacy Note

All workers, job scopes, emails, phone numbers, contacts, clients, and sites in this dataset are synthetic. The data exists only for internal LIFTIQ screen-recording and founding-partner demonstration use.
