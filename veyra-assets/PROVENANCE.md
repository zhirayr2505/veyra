# Asset ownership and provenance

This package contains newly authored VEYRA geometric SVG vectors, interface primitives and original flat scene illustrations. It is intended for the user's VEYRA project. It does not include Badoo source files, Badoo trademarks, screenshots, icons or proprietary typography, nor assets downloaded from commercial marketplaces.

The brand's **name** VEYRA is retained. The proposed new wordmark is an independent vector construction; commercial trademark clearance and uniqueness checks are separate steps before broad release.

No third-party font files are distributed: interface CSS uses system fallbacks. The optional PNG export utility uses the existing `sharp` project dependency.

## Notes for production
- The source vectors are editable; do not rasterize UI icons for everyday browser use.
- Do not use concept mockup people as real profiles.
- Telegram bot avatars require raster uploads: run `node veyra-assets/tools/export-png.mjs` after `npm ci`.
- Run `node veyra-assets/tools/export-png.mjs --all` for a full set of separate PNG exports (generated locally into `veyra-assets/exports/png`, not tracked).
