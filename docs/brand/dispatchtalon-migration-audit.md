# DispatchTalon Migration Audit

Date: 2026-05-14

## Executive Verdict

The primary repo contained broad LIFTIQ references across public pages, portal UI, backend visible text, sales assets, LinkedIn ad assets, go-to-market docs, research, strategy, routes, deployment identifiers, and filenames.

The migration changed current user-facing surfaces to DispatchTalon and retained lower-risk technical identifiers where changing them could break routes, deployment, tests, automation, or historical traceability.

## Audit Scope

Primary repo:

- `C:\Users\raymo\OneDrive\Documents\GitHub\pressuresystems`

Inspected related local worktrees/workspaces:

- `C:\Users\raymo\OneDrive\Documents\GitHub\pressuresystems-clean-demo-dataset`
- `C:\Users\raymo\OneDrive\Documents\GitHub\pressuresystems-crane-counterweight-transport-planning`
- `C:\Users\raymo\OneDrive\Documents\GitHub\pressuresystems-liftiq-demo-content-system`
- `C:\Users\raymo\OneDrive\Documents\GitHub\pressuresystems-liftiq-public-site-current-capability-update`
- `C:\Users\raymo\Desktop\THE PRESSURE ACADEMY - COMPLETE\PRESSURE_SYSTEMS\PS_20_LIFTIQ`

Related worktrees were not edited in this PR. They are treated as stale or separate work surfaces unless explicitly promoted.

## Initial Primary Repo Findings

Initial tracked text scan found:

- 800 line-level hits for LIFTIQ / LiftIQ / liftiq / route / env / related search terms.
- User-facing hits in public pages, portal UI, sales docs, LinkedIn copy, go-to-market docs, README, and current product docs.
- Technical hits in route paths, Fly app, database paths, package names, local storage keys, and env vars.
- Historical hits in research, old homepage audit, FCC strategy, and phase PRD files.

## Related Workspace Findings

Light text scan found old-name references in:

| Location | Files scanned | Match lines | Classification |
|---|---:|---:|---|
| `pressuresystems-clean-demo-dataset` | 110 | 733 | Stale related worktree; audit only. |
| `pressuresystems-crane-counterweight-transport-planning` | 97 | 661 | Stale related worktree; audit only. |
| `pressuresystems-liftiq-demo-content-system` | 127 | 767 | Stale related worktree; audit only. |
| `pressuresystems-liftiq-public-site-current-capability-update` | 100 | 665 | Stale related worktree; audit only. |
| Desktop `PS_20_LIFTIQ` workspace | 134 | 1088 | Master governance/workspace references; requires later governance update. |

## Classification

### A. Replace Now

- Public page titles, meta descriptions, visible headings, CTA copy, and footer references.
- Portal title, login heading, topbar brand, and visible warnings.
- Sales command centre/docs.
- LinkedIn ad copy and visible ad exports.
- Current go-to-market and data-model docs.
- Backend user-facing messages and tests.

### B. Keep Temporarily

- `/liftiq/` route.
- `https://liftiq-pilot.fly.dev/console/`.
- `liftiq-pilot` Fly app.
- `liftiq.db`.
- `liftiq-backend`.
- `LIFTIQ_` env vars.
- `liftiq.*` local storage keys.
- `assets/css/liftiq.css`.
- `assets/js/liftiq.js`.
- `content/liftiq-linkedin-ads/`.

### C. Replace Later With Migration Plan

- Public route `/dispatchtalon/`.
- Public sitemap route names.
- Content folder names.
- Env vars and local storage keys.
- Fly app / portal domain if ever approved.
- Master workspace folder `PS_20_LIFTIQ`.

### D. Historical Reference

- `docs/liftiq-homepage-content-audit.md`.
- `research/liftiq-job-intake-catalogue-research.md`.
- `strategy/fcc-competitive-analysis.md`.
- `strategy/liftiq-phase1-prd.md`.
- `docs/brand/liftiq-renaming-risk-review.md`.
- `docs/brand/replacement-name-shortlist.md`.
- `docs/brand/trademark-attorney-brief.md`.

### E. Requires Human / Legal Review

- Trademark attorney docs.
- Domain reservation and public route migration.
- Historical strategy docs that may need strategic rewrite.
- External campaign assets already distributed outside the repo.

## Post-Migration Snapshot

After replacement:

- Current public and portal visible product name is DispatchTalon.
- One public transition note remains on the main product page.
- Route/domain/deployment references remain intentionally unchanged.
- Historical old-name references remain in preserved research and strategy docs.
