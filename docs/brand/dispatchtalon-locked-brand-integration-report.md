# DispatchTalon Locked Brand Integration Report

## Executive Verdict

The locked DispatchTalon brand board has been copied into the repository, extracted into individual raster production assets, and integrated across current public, portal, sales, and LinkedIn ad surfaces.

No new product behaviour, backend logic, routes, deployment names, environment variables, or legal clearance claims were introduced.

## Source Board Used

- `assets/logos/dispatchtalon/source/dispatchtalon-locked-brand-board.png`
- `assets/logos/dispatchtalon/dispatchtalon-locked-brand-board.png`

The board supplied by Cody is treated as the visual source of truth.

## Assets Created

- Primary mark: `assets/logos/dispatchtalon/dispatchtalon-primary-mark.png`
- Primary lockup: `assets/logos/dispatchtalon/dispatchtalon-primary-lockup.png`
- App icons and favicons: `assets/logos/dispatchtalon/dispatchtalon-app-icon-*`, `dispatchtalon-favicon-*`, and `dispatchtalon-favicon.ico`
- Monochrome variants: `dispatchtalon-monochrome-light.png`, `dispatchtalon-monochrome-dark.png`
- Secondary blue variant: `dispatchtalon-blue-variant.png`
- Website, portal, social, and ad-specific derivatives.
- Manifest: `assets/logos/dispatchtalon/dispatchtalon-brand-manifest.json`

## Public Site Integration

- DispatchTalon public pages under `/liftiq/` now use the locked website header lockup.
- Main DispatchTalon page hero now includes the locked primary lockup.
- Product card on the Pressure Systems homepage now uses the locked primary lockup.
- DispatchTalon public page favicon references now use the locked favicon PNG/ICO assets.
- DispatchTalon social-card PNGs were regenerated with the locked lockup.

## Portal Integration

- Console login screen uses the locked portal login lockup.
- Console topbar uses the locked website header lockup.
- Console favicon references use the locked app icon/favicons served from `backend/public/console/assets/`.
- Login copy remains invite-only and does not reintroduce seed-password warning language.

## Sales And Content Integration

- Sales command centre sidebar uses the locked primary lockup.
- Sales markdown files include the locked primary lockup at the top.
- LinkedIn ad board uses the locked ad corner mark.
- LinkedIn ad exports were regenerated in square, landscape, and vertical formats.

## What Was Not Changed

- `/liftiq/` public route remains unchanged.
- `https://liftiq-pilot.fly.dev/console/` remains unchanged.
- Fly app name `liftiq-pilot` remains unchanged.
- LIFTIQ technical identifiers remain where previously documented for route/deployment stability.
- Existing historical LIFTIQ brand-risk and migration documents remain available.
- Existing `assets/logos/DispatchTalon_*.svg` and `assets/logos/LiftIQ_*.svg` files are retained as historical/compatibility artefacts, not the locked current mark system.

## SVG Status

True SVG files were not generated in this pass. The approved source is a raster brand board, and creating SVGs by embedding PNGs would misrepresent the asset quality. Final designer vectorisation remains a separate optional step.

## Background Status

The exported assets preserve the locked-board mark on a dark charcoal field. Transparent-background exports were not attempted because the supplied source is raster and edge extraction would risk degrading the locked mark.

## Remaining Old Or Rejected Mark References

- `assets/logos/LiftIQ_*.svg`: retained compatibility/historical artefacts, not current-facing references.
- `assets/logos/DispatchTalon_*.svg`: retained prior migration aliases, superseded by `assets/logos/dispatchtalon/`.
- `content/liftiq-linkedin-ads/source-screenshots/*liftiq*`: retained source screenshot filenames only.
- `/liftiq/` route and `liftiq-pilot` deployment identifiers: retained technical identifiers.

## Validation Notes

- Image dimensions and file sizes should be verified before merge.
- Static public routes should be checked under existing `/liftiq/` paths.
- Credential, claim-boundary, and public-pricing scans should be run before PR merge.
