# Card asset sources

Original public-domain scans and their provenance live in `cards/rws/`; Vite only
ships `public/`. Keep the originals unchanged. `og-cover.png` is the original
social preview, retained here so optimization never compounds image loss.

Run `npm run assets:optimize` after changing artwork. `npm run build` also runs it
through `prebuild`. Sharp produces 240/480px AVIF and WebP, one 240px JPEG fallback,
the palette-optimized social PNG, and the fallback dimension table. Mild smoothing
reduces scan grain; the maximum 480px width is intended for the current small card
layouts, not full-screen zoom or print.

Commit the generated `public/cards/rws/*`, `public/og-cover.png`, dimension table,
and `generated-assets.json`: development works without generation. The latter
stores source and pipeline hashes, so unchanged builds skip encoding even after a
fresh checkout. Missing derivatives regenerate their card. Changing the script
or Sharp versions invalidates the cache. Encoding is sequential to bound memory.

The image tests validate every declared size, fallback, and the complete deck's
9 MB budget. Do not put original scans or legacy variant directories in `public`.

## Size verification

Measured with `du -sb` on this workstream's production build:

| Asset | Before | After |
| --- | ---: | ---: |
| `dist` | 90,607,375 bytes | 8,548,086 bytes |
| Shipped card directory | 90,063,059 bytes | 8,066,781 bytes |
| Social PNG | 150,149 bytes | 87,335 bytes |

Total build reduction: 90.6%. These figures include directory metadata; the
application bundle can change when the other workstreams are merged.
