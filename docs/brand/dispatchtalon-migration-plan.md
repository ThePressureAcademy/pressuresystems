# DispatchTalon Migration Plan

Date: 2026-05-14

## 1. Executive Verdict

Proceed with a controlled user-facing migration from LIFTIQ / LiftIQ to DispatchTalon while retaining technical identifiers that could break routes, deployment, environment variables, local storage, database paths, or historical references.

This is a brand-transition implementation, not a legal-clearance claim.

## 2. What Changes Now

Replace visible current product references in:

- Public website copy and metadata.
- Portal login, title, topbar, and user-facing notices.
- Sales command centre and sales docs.
- LinkedIn ad copy and visible export artwork.
- Current-facing product docs and go-to-market docs.
- Backend visible messages, seeded display notes, and tests.
- Public social-card image contents.

## 3. What Stays Temporarily

Retain for deployment stability:

- `/liftiq/` public URL route.
- `https://liftiq-pilot.fly.dev/console/`.
- Fly app name `liftiq-pilot`.
- `liftiq.db` database filename/defaults.
- Local storage keys such as `liftiq.token`.
- `LIFTIQ_` environment variables.
- `liftiq-backend` package/service identifiers.
- CSS/JS filenames and class names using `liftiq`.
- Existing content folder names such as `content/liftiq-linkedin-ads/`.

## 4. What Changes Later

Plan separately:

- `/dispatchtalon/` route.
- Redirect from `/liftiq/`.
- Branded portal/domain path.
- Env var rename with backward-compatible fallback.
- Fly app rename or new app, if ever required.
- Folder/file-name migration for content packs.
- Local storage key migration.
- Database filename migration if required.

## 5. Public Transition Language

Use once on the main product page:

> DispatchTalon is the new working product name for the dispatch intelligence platform previously developed as LIFTIQ.

Do not mention trade mark risk publicly.

## 6. Technical Route / Domain Plan

See `docs/brand/dispatchtalon-route-domain-plan.md`.

## 7. Risk Controls

- No blind lower-case `liftiq` replacement.
- Routes and deployment names retained.
- Historical docs preserved.
- Public claim boundaries preserved.
- Password/login security wording retained.
- No pricing changes.
- No backend product logic changes intended.

## 8. QA Checklist

- Public pages load under `/liftiq/`.
- Portal login title and invite-only wording show DispatchTalon.
- No public page presents LIFTIQ as the current product name except the single transition note.
- Technical `liftiq` references are classified.
- No credentials, JWTs, Fly secrets, or passwords introduced.
- No compliance, permit, legal road access, lift-engineering, or autonomous-dispatch claims introduced.
- LinkedIn exports visibly show DispatchTalon.
