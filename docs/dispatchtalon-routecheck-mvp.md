# DispatchTalon RouteCheck MVP

## Purpose

RouteCheck is a hidden pilot feature for manual route and access review before dispatch.

It gives DispatchTalon a structured review trail for jobs that may involve heavy vehicles, crane movement, oversized plant, site access limits, permits, route notes, external route-review links, and operator acknowledgement.

## Product Boundary

RouteCheck is dispatch decision support and audit capture only.

It does not:

- calculate a route
- provide GPS navigation
- scrape third-party route tools
- verify permits automatically
- confirm route compliance
- certify a route as safe
- provide engineering, legal, road-authority, or safety approval
- dispatch autonomously

Final movement remains subject to permits, road authority requirements, site conditions, road conditions, operator verification, and business review.

## Feature Flag

RouteCheck is disabled unless:

```text
ROUTECHECK_ENABLED=true
```

When disabled:

- the console navigation item is hidden
- `/api/route-checks/config` returns 404
- all `/api/route-checks` operations are blocked
- `/routecheck` returns 404

When enabled:

- `/routecheck` redirects to the private console route `/#/routecheck`
- the console shows a RouteCheck navigation item
- job detail pages show a RouteCheck panel
- API access remains authenticated and tenant-scoped

## MVP Workflow

1. Dispatcher or admin creates a RouteCheck for a job.
2. DispatchTalon evaluates whether route/access review appears needed from job and asset context.
3. Dispatcher records external route-review links manually if used.
4. Dispatcher records route, access, permit, hazard, site, or management notes.
5. Permit/access status can be recorded.
6. RouteCheck can be marked checked, issue-flagged, blocked, sent to operator, operator acknowledged, or reviewed for dispatch trail.
7. Operator acknowledgement is recorded manually.
8. Audit events are recorded for RouteCheck actions.

## Permissions

V1 uses the current pilot role model.

- `admin`: create, edit, mark review complete, override blockers, view.
- `dispatcher`: create, edit, mark review complete only when no blockers require admin override, view.
- `supervisor`: view and record operator acknowledgement.
- `viewer` and advisor/demo users: view only where normal tenant access allows it.
- Internal admin: only through existing internal controls if they already apply safely.

Admin override requires a written reason when blockers exist.

Critical route risk, unresolved issues, blocked status, unchecked status, or required-but-unconfirmed permit/access status block normal review completion.

## Data Model

Additive tables:

- `vehicle_profiles`
- `route_checks`
- `route_check_events`
- `route_notes`
- `external_route_links`
- `operator_acknowledgements`
- `permit_records`

All RouteCheck records are tenant-scoped by `company_id` through their linked job and route-check row.

## Manual Routing Provider

The MVP includes only a manual routing provider placeholder.

No third-party API calls are made.

No routing provider credentials are required.

No generated route is stored as trusted route truth.

## Claim-Safe Language

Use:

- RouteCheck
- route/access review
- dispatch review trail
- manual review
- permit/access status
- operator acknowledgement
- review before dispatch

Do not use:

- approved route
- compliant route
- legal to travel
- safe route
- safety certified
- compliance approved
- autonomous dispatch
- guaranteed route approval

## Future Candidates

Do not build yet:

- map rendering
- GPS navigation
- SMS links
- shared login with external routing systems
- automated permit lookup
- scraping of route portals
- hvNavigator integration
- public RouteCheck marketing page
- external customer route portal

Future integrations must preserve the same rule: RouteCheck can support review, but it must not claim legal, compliance, route, engineering, or safety approval.
