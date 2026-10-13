# Browser regression checks

Run `npm run build` followed by `npx playwright test`. Playwright starts its own
Vite preview on port 4310 and stops it afterwards. Set `PLAYWRIGHT_PORT` to change
that port; existing servers are never reused.

Chromium covers readings, daily guidance, persistence, image fallbacks, responsive
layouts, PNG exports and accessibility. Poster tests check the PNG signature and
full dimensions. Axe checks fail on serious or critical violations.

The visual projects compare viewport screenshots at 1440×900, 390×844 and
768×1024 (DPR 1, 3 and 2 respectively). Baselines preserve fixed navigation and
capture the home hero before scrolling, then the draw, unrevealed and revealed results, populated records
and expanded encyclopedia views reached through user actions. Images are decoded
without scrolling; time, timezone, shuffle randomness and reduced motion are
fixed. Screenshots disable animations and use CSS pixels for compact baselines.

After an intentional design change, run:

```sh
npx playwright test visual-views --update-snapshots --workers=2
npx playwright test visual-views --workers=2
```

Inspect every changed PNG in `visual-views.spec.ts-snapshots/` before accepting it.
The DESIGN regression checks cover keyboard focus continuity, distinct position
names, and selected encyclopedia heading visibility at 390px and 768px. The
selection tests deliberately never scroll the detail into view themselves.

The optional WebKit project covers mobile/desktop responsive image decoding,
source selection, horizontal containment, navigation and a daily PNG export:

```sh
npx playwright install --with-deps webkit
PLAYWRIGHT_WEBKIT=1 npx playwright test --project=webkit-smoke
```

CI enables it only when that installation succeeds; otherwise Chromium still
runs. WebKit could not be installed in the restricted development container
because system-dependency installation requires unavailable sudo privileges.

CI retains browser reports, traces, screenshots, videos, exported posters and
axe results. Unit tests also run across the CI timezone matrix; local JUnit output
is available with `CI=true npm test`.

R4 adds complete revealed Celtic Cross board baselines at desktop and tablet
widths, explicitly switching to “牌阵布局”. Mobile keeps its readable grid and
skips this spatial-only case. The desktop animation check also selects layout
mode before revealing a card.

The Celtic Cross card-overlap regression permits only the intentional central
crossing. Spatial baselines are visually reviewed after layout changes.

PWA coverage currently exercises first-install offline behavior only. A reliable
two-deployment update test remains deferred: the shared preview serves one built
`dist`, and changing it during parallel tests would race other browsers. Such a
test needs isolated versioned deployment fixtures and worker lifecycle control;
request interception alone does not represent a service-worker upgrade. The
existing chunk-recovery test covers a failed lazy import and reload recovery,
but does not claim to cover obsolete chunks across deployments.
