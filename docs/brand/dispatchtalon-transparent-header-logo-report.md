# DispatchTalon Transparent Header Logo Report

## Verdict

The public DispatchTalon floating header and portal access surfaces now use raster-derived transparent runtime assets from the locked DispatchTalon board instead of baked-background logo tiles.

## Issue Fixed

The previous website and portal header assets preserved the locked board's dark charcoal rectangle inside the PNG. On translucent or differently shaded header panels, that appeared as a pasted tile and created a visible colour mismatch.

## Assets Created

- `assets/logos/dispatchtalon/dispatchtalon-header-lockup-transparent.png`
- `assets/logos/dispatchtalon/dispatchtalon-header-mark-transparent.png`
- `backend/public/console/assets/dispatchtalon-header-lockup-transparent.png`
- `backend/public/console/assets/dispatchtalon-header-mark-transparent.png`

## Integration

- Public DispatchTalon `/liftiq/` route family now uses `dispatchtalon-header-lockup-transparent.png` in the floating navigation.
- Portal login and topbar now use the portal-local transparent lockup copy.
- Header image CSS now explicitly removes image backgrounds, borders, radius, and shadows.

## Not Changed

- The `/liftiq/` route remains unchanged.
- Fly app and backend route names remain unchanged.
- No backend product logic changed.
- No SVG files were created.
- Old baked-background assets are retained for historical/source continuity and contexts where their dark board background is intentional.

## Limitation

These transparent files are raster-derived from the approved locked board. They are acceptable for dark graphite header surfaces, but a true designer-vector SVG master is still the correct long-term source for wider asset production.
