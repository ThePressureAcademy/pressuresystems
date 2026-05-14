# DispatchTalon Portal Brand UI Integration Report

## Verdict

The portal now uses the locked DispatchTalon mark system across the current console UI surfaces without changing backend product logic, API routes, Fly app names, or LIFTIQ-era technical identifiers.

## Assets Used

Portal-local assets were created under:

- `backend/public/console/assets/dispatchtalon/dispatchtalon-logo-lockup.png`
- `backend/public/console/assets/dispatchtalon/dispatchtalon-logo-lockup-small.png`
- `backend/public/console/assets/dispatchtalon/dispatchtalon-mark-transparent.png`
- `backend/public/console/assets/dispatchtalon/dispatchtalon-mark-watermark.png`
- `backend/public/console/assets/dispatchtalon/dispatchtalon-app-icon.png`
- `backend/public/console/assets/dispatchtalon/dispatchtalon-favicon-32.png`
- `backend/public/console/assets/dispatchtalon/dispatchtalon-favicon-192.png`

These are derived only from the locked assets in `assets/logos/dispatchtalon/`.

## Portal Surfaces Updated

- Login screen lockup and invite-only copy.
- Mandatory password-change screen brand mark.
- Topbar compact lockup.
- Browser favicon and app icon references.
- Loading and route-error states.
- Dashboard hero panel.
- Build My Business setup panel.
- Our Business setup toolbar.
- Labour-only asset-register hidden state.
- Asset register no-class state.
- Workers, jobs, schedule, audit, and metrics empty states.

## Transparent Asset Status

The approved source is still raster, not true vector. The portal uses a transparent mark and a low-opacity watermark derivative for subtle UI reinforcement. Primary lockups remain the approved dark-background raster exports to avoid rough lockup edge extraction.

Final designer/vector source is still recommended before broader brand system scaling.

## What Was Not Changed

- Backend product logic.
- Auth or password-rotation behaviour.
- API routes.
- Fly app name `liftiq-pilot`.
- Public route `/liftiq/`.
- LIFTIQ-prefixed technical environment variables.
- Database schema.

## QA Notes

- Do not use old LIFTIQ marks in current portal UI.
- Do not use rejected claw-only concepts.
- Do not treat the raster-derived transparent mark as a final vector master.
- Do not place compliance, permit, legal road access, lift-engineering, autonomous-dispatch, or safety-guarantee claims beside the mark.
