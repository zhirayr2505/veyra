# VEYRA — Work-approved icon pack

This directory is the canonical asset source in the repository root, copied to `public/veyra-approved/` for web delivery.

- 52 **approved Work SVG icon geometries** with inactive grey, active violet, and on-dark white states.
- 12 supplemental matching utility glyphs for controls required by the live app (including undo, arrows and checks).
- 20 approved interest SVG geometries, normal and selected versions.

Use the original approved ZIP `VEYRA_ASSET_PACK_v1.zip` for additional logo/empty state/PNG assets; this commit integrates the icon subsystem into the live application. The full archive is kept in the conversation Library, not in this GitHub folder.

Source-of-truth files: `01_icons/{inactive,active,on_dark}` and `02_interest_icons/svg/{normal,selected}`.

Web-served mirror: `public/veyra-approved/`.

Do not mix generic Lucide navigation icons or old V2 icons for a glyph included in this set. System font and user data remain unchanged.
