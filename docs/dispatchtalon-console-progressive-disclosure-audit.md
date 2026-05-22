# DispatchTalon Console Progressive Disclosure Audit

INTERNAL ONLY — NOT FOR PUBLIC DISTRIBUTION

Product: DispatchTalon by Pressure Systems

Status: Console usability audit for Our Business setup, Asset Register, and Create Job speed.

Boundary: This audit does not approve compliance, permits, legal road access, lift engineering, payroll, invoicing, Xero/MYOB integration, or live SMS sending. Dispatcher review remains required.

## Summary

The console should keep required operational information visible while collapsing setup, technical, advanced, or rarely used detail until the user needs it. The immediate repair is to make Our Business setup collapsible, keep Asset Register focused on saved company assets, and prevent Create Job from showing irrelevant plant selectors in Labour-only mode.

## Progressive Disclosure Register

| Screen | Current friction | Required visible information | Candidate collapse/minimise item | User benefit | Risk | Implement now / later | Notes |
|---|---|---|---|---|---|---|---|
| Dashboard | Metrics and setup prompts can compete for attention on first run. | Security notice, core metrics, next setup action, recent activity status. | Long setup explanation after first use. | Faster orientation. | Hiding first-run guidance too early. | Later | Keep Build My Business prompt visible while setup is incomplete. |
| Recent Activity / Audit | Technical detail can reduce trust if exposed by default. | Timestamp, event, status/result, reference. | Raw payload, user ids, internal refs. | More customer-facing audit trail. | Debug evidence becomes harder to find. | Implemented previously | Technical detail remains controlled/collapsed. |
| Our Business / Build My Business | Multiple setup panels can feel like a wall when open together. | Operating mode, selected count, current setup status, collapse controls. | Business basics, static reference library, requirement categories, asset register, reset tools. | Setup feels calmer and users can jump to Asset Register faster. | A user may miss a collapsed section. | Implement now | Section headers carry status chips and counts. |
| Operating mode | Important but not always needed after selection. | Current Labour-only or Plant + labour state. | Radio card body after selection. | Reduces repeated setup clutter. | Mode changes affect visible job fields. | Implement now | Keep collapsed state persisted per session/user/company. |
| Business timezone | Needed for job defaults, rarely edited. | Saved timezone status. | Timezone selector after saved. | Keeps setup compact. | Wrong timezone can affect schedule interpretation. | Implement now | Status chip shows saved/needs review. |
| Requirement catalogue | Large catalogue can overwhelm first-time users. | Category section summaries and selected counts. | Credentials, site conditions, equipment, transport, specialist sections. | Users can focus on one setup category at a time. | Over-collapsing can hide a required selection. | Implement now | Credentials/equipment open by default only when useful. |
| Asset Register | Long class lists and empty groups slow plant setup. | Asset count, enabled class count, group count summaries. | Asset class groups and individual asset details. | Faster plant number entry and review. | Warning hidden if not surfaced in group summary. | Implement now | Review badge remains visible in group summary. |
| Workers | Worker list can be dense after import. | Name, role/status, high-level credential/fatigue state. | Long credential detail and notes. | Faster scanning. | Critical credential block hidden. | Implemented partially | Credential tiles expose status and expiry in summary. |
| Worker import | Import guidance can be long after first import. | Upload/paste action, expected columns, validation result. | Sample explanation after first successful import. | Less import fatigue. | Users may import wrong columns. | Later | Keep sample downloads visible. |
| Worker details | Credentials and fatigue can create vertical clutter. | Worker identity, role/status, urgent blocks. | Credential tile bodies, notes, secondary metadata. | Cleaner worker review. | Expired credential risk hidden. | Implemented partially | Summary must show status/expiry where available. |
| Jobs list | Dense job state can hide next action. | Job reference/client/site/date/status. | Secondary planning metadata. | Faster job selection. | Important risk not visible. | Later | Keep warning badges visible. |
| Create Job | Too many sections slow job creation, especially in Labour-only mode. | Basics, date/time/timezone, site/client, roles, credentials, requirement class, save path. | Advanced notes, one-off tools, crane/counterweight transport, asset selector until equipment selected. | Faster first job creation. | Hiding required review context. | Later | Current repair keeps Labour-only asset selector hidden and saved-asset selector contextual. |
| Job Brief Import | Review payload can be long. | Extracted basics, warnings, create/cancel actions. | Source text and low-confidence extraction details after import. | Faster confirmation. | User may miss import errors. | Later | Keep warnings visible. |
| SmartRank / Role Coverage | Scoring detail can overwhelm dispatchers. | Rank, blocked/warned state, role coverage, review-required reasons. | Full scoring breakdown. | Better allocation decision clarity. | Trust drops if rationale is unavailable. | Later | Do not hide blocks or warnings. |
| Allocation confirmation | Publish details can feel technical. | Selected worker, manual publish state, SMS preview/copy action. | Technical notification metadata. | Cleaner manual publish flow. | Audit detail unavailable. | Later | Keep manual publish boundary visible. |
| Schedule | Calendar density can grow quickly. | Date, job, assigned worker, status. | Advanced filters and secondary metadata. | Better schedule scanning. | Filtering hidden from power users. | Later | Avoid hiding conflict warnings. |
| Reports & Exports | Explanations can repeat after first use. | Export type and download action. | Long export definitions after first successful use. | Faster office handoff. | Export misuse if exclusions hidden. | Later | Keep "office review" boundary visible. |
| Metrics | Useful for management, not every dispatcher. | Key operating indicators and trends. | Secondary breakdowns. | Less dashboard noise. | Loss of audit visibility. | Later | Keep core metrics accessible. |
| Settings | Admin controls can distract operators. | Account/security and company basics. | Advanced admin-only actions. | Lower accidental action risk. | Admin may need fast access. | Later | Keep destructive controls guarded. |

## Create Job Speed Audit

Priority order for Create Job should remain:

1. Job basics.
2. Date, time, timezone, and schedule status.
3. Location, site, and client.
4. Required roles and counts.
5. Required credentials.
6. Equipment or asset context only when Plant + labour mode is active.
7. Site conditions.
8. Notes and one-off requirements.
9. Save path and SmartRank path.

IF operating mode is Labour-only, THEN hide plant, crane, transport, and specific asset selectors by default.

IF operating mode is Plant + labour and equipment/transport classes are selected, THEN show the saved company asset selector for those classes only.

IF no saved assets exist for a selected class, THEN show a clear empty state: add plant numbers in Our Business or continue with one-off job context.

IF a role implies an enabled credential requirement, THEN credentials should be easy to find, but CredentialGate must remain the allocation gate.

IF SmartRank, CredentialGate, FatigueGuard, or role coverage raises a block or warning, THEN the warning must stay visible and must not be collapsed behind technical detail.

## Next Minimise Opportunities

- Collapse advanced Create Job planning fields after basics and requirements are filled.
- Collapse SmartRank scoring breakdown while keeping block/warning reasons visible.
- Collapse export explanatory copy after first successful export.
- Collapse import source text after job brief extraction is reviewed.
- Keep reset/destructive company actions collapsed and admin-gated.
