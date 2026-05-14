# DispatchTalon Transparent Header Logo Report

## Verdict

The public DispatchTalon floating header, `/liftiq/` hero, root product card, and portal access surfaces no longer use baked-background logo tiles. The public header now uses clean typography, and the transparent mark is reserved for subtle dark-surface watermark and portal-orientation use.

## Issue Fixed

The previous website and portal header assets preserved the locked board's dark charcoal rectangle inside the PNG. On translucent or differently shaded header panels, that appeared as a pasted tile and created a visible colour mismatch.

## Assets Created

- `assets/logos/dispatchtalon/dispatchtalon-header-lockup-transparent.png`
- `assets/logos/dispatchtalon/dispatchtalon-header-mark-transparent.png`
- `backend/public/console/assets/dispatchtalon-header-lockup-transparent.png`
- `backend/public/console/assets/dispatchtalon-header-mark-transparent.png`

## Integration

- Public DispatchTalon `/liftiq/` route family now uses a typographic floating-nav brand treatment instead of a logo image.
- The `/liftiq/` hero now uses an integrated text brand lockup and a low-opacity transparent mark watermark instead of a boxed logo banner.
- Portal login and topbar now use mark-plus-type structure instead of a full image banner.
- The root Pressure Systems product card now uses a typographic DispatchTalon treatment instead of a dark lockup tile.
- Header and portal CSS explicitly prevents logo imagery from rendering as a card.

## Not Changed

- The `/liftiq/` route remains unchanged.
- Fly app and backend route names remain unchanged.
- No backend product logic changed.
- No SVG files were created.
- Old baked-background assets are retained for historical/source continuity and contexts where their dark board background is intentional.

## Limitation

These transparent files are raster-derived from the approved locked board. They are acceptable for dark graphite header surfaces, but a true designer-vector SVG master is still the correct long-term source for wider asset production.
