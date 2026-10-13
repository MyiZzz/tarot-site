# Browser regression checks

Run `npm run build` followed by `npx playwright test`. Playwright starts its own
Vite preview on port 4302 and stops it afterwards. Set `PLAYWRIGHT_PORT` to change
that port; existing servers are never reused.

Chromium covers readings, daily guidance, persistence, image fallbacks, responsive
layouts, PNG exports and accessibility. Poster tests check the PNG signature and
full dimensions. Axe checks fail on serious or critical violations.

The visual projects compare viewport screenshots at 1440×900, 390×844 and
768×1024 (DPR 1, 3 and 2 respectively). Baselines preserve fixed navigation and
capture the home hero before scrolling, then the draw, result, populated records
and expanded encyclopedia views reached through user actions. Images are decoded
without scrolling; time, timezone, shuffle randomness and reduced motion are
fixed. Screenshots disable animations and use CSS pixels for compact baselines.

After an intentional design change, run:

```sh
npx playwright test visual-views --update-snapshots --workers=2
npx playwright test visual-views --workers=2
```

Inspect every changed PNG in `visual-views.spec.ts-snapshots/` before accepting it.
Baseline refreshes after the DESIGN R3 merge are expected. Current baselines record
the existing layout; they do not certify that the known DESIGN issues are fixed.

Four DESIGN R3 regressions in `design-interactions.spec.ts` use `test.fail`:
keyboard focus continuity, distinct position names, and selected encyclopedia
heading visibility at 390px and 768px. These assertions run and reproduce the
known defects without editing another workstream's components. Remove each
annotation when its fix merges: Playwright fails on an unexpected pass. The
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
