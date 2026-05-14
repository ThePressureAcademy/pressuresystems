# DispatchTalon Migration Report

Date: 2026-05-14

## 1. Executive Verdict

The user-facing product name has been migrated from LIFTIQ / LiftIQ to DispatchTalon across the primary repo's current public, portal, sales, content, ad, and active documentation surfaces.

This migration does not claim legal clearance. It preserves LIFTIQ as historical and technical context where needed.

## 2. Files Changed

Major changed areas:

- Public site: `index.html`, `liftiq/*.html`, `privacy-policy.html`.
- Portal UI: `backend/public/console/index.html`, `backend/public/console/app.js`.
- Backend visible text/tests: selected `backend/src/*`, `backend/tests/console.test.js`, `backend/package.json`, `backend/README.md`, `backend/fly.toml`.
- Sales assets: `sales/liftiq-*`.
- LinkedIn ad pack: `content/liftiq-linkedin-ads/**`.
- Social cards: `assets/social/LiftIQ_*_OG_1200x630.png` and `assets/social/DispatchTalon_*_OG_1200x630.png`.
- Current docs: `README.md`, `docs/liftiq-data-model.md`, `go-to-market/founding-partner-pilot.md`.
- Brand governance: `docs/brand/*`.

## 3. User-Facing Replacements Completed

- Public copy displays DispatchTalon.
- Portal login/title/topbar display DispatchTalon.
- CTA text uses DispatchTalon.
- Sales command centre and sales docs use DispatchTalon.
- LinkedIn ad copy and regenerated ad exports use DispatchTalon.
- Public social-card artwork now displays DispatchTalon.
- Main product page includes one controlled transition note.

## 4. Technical Identifiers Intentionally Retained

Retained:

- `/liftiq/`.
- `https://liftiq-pilot.fly.dev/console/`.
- `liftiq-pilot`.
- `liftiq_data`.
- `liftiq.db`.
- `liftiq-backend`.
- `LIFTIQ_DISABLE_WAL`.
- `LIFTIQ_PORTAL_URL`, `LIFTIQ_DEMO_EMAIL`, and `LIFTIQ_DEMO_PASSWORD` where present in related automation/docs.
- `liftiq.token`, `liftiq.user`, `liftiq.passwordReminderDismissed`.
- `assets/css/liftiq.css`.
- `assets/js/liftiq.js`.
- `content/liftiq-linkedin-ads/`.

Reason: changing these in this pass could break deployment, routes, local storage, automation, historical continuity, or external links.

## 5. Historical References Retained

Retained intentionally:

- Trademark/naming risk documents.
- Historical homepage audit.
- Job intake catalogue research.
- FCC strategy.
- Phase 1 PRD.
- Old PR/branch names.
- References to LIFTIQ inside explicit "previously developed as LIFTIQ" transition wording.

## 6. Routes / Domains Retained

Public route remains:

- `https://pressuresystems.au/liftiq/`

Portal route remains:

- `https://liftiq-pilot.fly.dev/console/`

Future route/domain migration is documented in `docs/brand/dispatchtalon-route-domain-plan.md`.

## 7. Content Assets Regenerated

Regenerated / added:

- 4 square LinkedIn ad exports.
- 4 landscape LinkedIn ad exports.
- 4 vertical LinkedIn ad exports.
- 6 public social-card PNG files.
- 6 new DispatchTalon social-card PNG aliases.
- 3 new DispatchTalon SVG logo aliases.

Filenames remain old where changing them would require route/meta/static-asset migration.

## 8. Tests / Checks Run

- `git diff --check`: passed.
- `backend/package.json` JSON parse: passed.
- Static file existence/name check for `/`, `/liftiq/`, `/liftiq/how-it-works/`, `/liftiq/modules/`, `/liftiq/contact/`, `/liftiq/design-partner/`, `/liftiq/dispatch-blind-spot-diagnostic/`, `/liftiq/executive-briefing/`, `/liftiq/sample-preview/`: passed.
- Backend tests: blocked in this local Windows environment because `npm ci` cannot install `better-sqlite3` under Node 24 without Visual Studio C++ build tools. Bundled Python was found on retry; Visual Studio C++ tools were not.
- Old-name scan: remaining hits are classified as technical, historical, route/domain, or the single public transition note.
- Credential scan: no new credentials introduced by this migration. Existing backend bootstrap/test placeholder references remain outside this brand-migration scope.
- Claim-boundary scan: remaining public hits are negative boundary statements only.
- Pricing exposure scan: no public pricing table or price amounts found.
- Image dimension/file-size check: passed for 12 LinkedIn ad exports and 6 social-card PNGs; all under 5 MB.

## 9. Remaining LIFTIQ Hits And Classification

Remaining old-name references are expected in:

- Technical route/domain/deployment identifiers.
- Technical local storage/env/database identifiers.
- Historical docs.
- Source screenshot filenames.
- One controlled public transition note.

Any remaining unexpected current-facing visible copy should be treated as a blocker.

## 10. Next Migration Phase

If DispatchTalon is accepted after human/legal review:

1. Secure domains and handles.
2. Add `/dispatchtalon/` route.
3. Redirect `/liftiq/` after a transition window.
4. Rename content folders and social-card filenames.
5. Add backward-compatible env/local-storage migration.
6. Decide whether Fly app/domain should remain or be replaced.
7. Update desktop master governance files.

## 11. Risks

- Legal clearance is not complete.
- `/liftiq/` still appears in URLs and technical paths.
- Stale worktrees outside this PR still contain old LIFTIQ references.
- Existing distributed screenshots/campaign assets outside repo may still show old branding.
- Master workspace `PS_20_LIFTIQ` governance still needs a controlled update.
