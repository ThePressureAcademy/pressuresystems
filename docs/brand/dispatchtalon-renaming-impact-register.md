# DispatchTalon Renaming Impact Register

Date: 2026-05-14

| File / area | Current reference type | Action | Replacement / status | Risk | Status |
|---|---|---|---|---|---|
| `index.html` | Visible root homepage product copy | Replace now | DispatchTalon | Low | Updated |
| `liftiq/*.html` | Visible public product pages and metadata | Replace now | DispatchTalon | Medium, route remains old | Updated |
| `assets/social/LiftIQ_*_OG_1200x630.png` | Public social-card image contents | Replace now, retain filename | DispatchTalon card artwork | Medium, filename debt | Updated |
| `assets/social/DispatchTalon_*_OG_1200x630.png` | New public social-card asset paths | Create now | DispatchTalon card artwork | Low | Added |
| `assets/logos/LiftIQ_*.svg` | Mark filenames, no visible text | Keep temporarily | Historical/compatibility artefact, not current locked mark | Low | Retained |
| `assets/logos/DispatchTalon_*.svg` | Prior migration aliases | Keep temporarily | Superseded by locked board exports under `assets/logos/dispatchtalon/` | Low | Retained/superseded |
| `assets/logos/dispatchtalon/*` | Locked brand board exports | Use now | DispatchTalon locked mark system | Low | Added |
| `assets/css/liftiq.css` | CSS filename/classes | Keep temporarily | Rename later only with route/CSS plan | Medium | Retained |
| `assets/js/liftiq.js` | JS filename/form helper | Keep temporarily | Rename later only with static asset plan | Medium | Retained |
| `backend/public/console/index.html` | Visible portal title/login/topbar | Replace now | DispatchTalon | Low | Updated |
| `backend/public/console/app.js` | Visible portal strings and local storage keys | Mixed | Visible strings DispatchTalon; `liftiq.*` keys retained | Medium | Updated/retained |
| `backend/src/routes/jobs.js` | User-facing brief warning | Replace now | DispatchTalon | Low | Updated |
| `backend/src/services/job-requirement-catalogue.js` | User-facing import warning and research source path | Mixed | Warning updated; research path retained | Low | Updated/retained |
| `backend/src/scripts/provision-pilot-tenants.js` | Demo/provision notes | Replace now | DispatchTalon | Low | Updated |
| `backend/src/server.js` | Console log | Replace now | DispatchTalon backend log | Low | Updated |
| `backend/src/app.js` | Health service id | Keep temporarily | `liftiq-backend` retained | Medium, live/check expectations | Retained |
| `backend/src/db.js` | Env var and DB path | Keep temporarily | `LIFTIQ_DISABLE_WAL`, `liftiq.db` retained | High if changed blindly | Retained |
| `backend/.env.example` | Env and DB defaults | Keep temporarily | `LIFTIQ_` / `liftiq.db` retained | High if changed blindly | Retained |
| `backend/Dockerfile` / `entrypoint.sh` | Linux user / DB path | Keep temporarily | `liftiq` system user retained | High if changed blindly | Retained |
| `backend/fly.toml` | Fly app / DB volume / comment | Mixed | Comment updated; app/volume retained | High if changed blindly | Updated/retained |
| `backend/package.json` | Package metadata | Mixed | Description updated; package name retained | Medium | Updated/retained |
| `backend/tests/console.test.js` | Visible string expectations | Replace now | DispatchTalon | Low | Updated |
| `backend/tests/job-brief-import.test.js` | Temp-dir name | Keep temporarily | `liftiq-legacy-*` retained | Low | Retained |
| `backend/tests/schedule.test.js` | Temp-dir name | Keep temporarily | `liftiq-legacy-*` retained | Low | Retained |
| `README.md` | Current repo documentation | Replace visible text, retain routes | DispatchTalon copy with `/liftiq/` routes | Low | Updated |
| `backend/README.md` | Backend docs | Mixed | Product wording updated; operational ids retained | Medium | Updated/retained |
| `docs/liftiq-data-model.md` | Current architecture doc | Replace current product name | DispatchTalon | Low | Updated |
| `docs/liftiq-homepage-content-audit.md` | Historical audit | Keep historical | LIFTIQ retained as historical | Low | Retained |
| `research/liftiq-job-intake-catalogue-research.md` | Historical/source research | Keep historical | LIFTIQ retained | Low | Retained |
| `strategy/fcc-competitive-analysis.md` | Historical strategy | Keep historical | LIFTIQ retained | Medium, needs later strategic rewrite | Retained |
| `strategy/liftiq-phase1-prd.md` | Historical PRD | Keep historical | LIFTIQ retained | Medium | Retained |
| `go-to-market/founding-partner-pilot.md` | Current-facing pilot offer | Replace now | DispatchTalon | Low | Updated |
| `sales/liftiq-*.md/html` | Internal sales assets | Replace now, retain filenames | DispatchTalon content | Low, filename debt | Updated |
| `content/liftiq-linkedin-ads/**/*.md/html` | Internal campaign pack | Replace visible text, retain folder | DispatchTalon copy | Medium, folder/source filename debt | Updated |
| `content/liftiq-linkedin-ads/exports/**/*.png` | Visible ad exports | Regenerate | DispatchTalon artwork | Low | Updated |
| `content/liftiq-linkedin-ads/source-screenshots/*liftiq*` | Source screenshot filenames | Keep temporarily | Historical/source filenames retained | Low | Retained |
| `sitemap.xml` | Public route paths | Keep temporarily | `/liftiq/` route retained | High if changed without redirect | Retained |
| `privacy-policy.html` | Public policy copy | Replace visible text | DispatchTalon | Low | Updated |
| `docs/brand/liftiq-*` | Naming/legal history | Keep historical with update note | DispatchTalon selected as working name | Low | Updated/retained |
| `docs/brand/dispatchtalon-*` | New migration governance | Create | Migration plan, guide, audit, route plan, report | Low | Added |
