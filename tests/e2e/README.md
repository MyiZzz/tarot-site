# Browser regression checks

Run `npm run build` followed by `npx playwright test`. Playwright starts the built
Vite preview on port 4173. CI always starts its own server; local runs may reuse
an existing server on that port.

The Chromium suite covers a three-card reading, daily guidance and archiving,
both PNG poster downloads, and mobile reading/encyclopedia navigation. PNGs are
checked for their signature and full poster dimensions and attached to the report.
Axe scans each completed flow and fails on serious or critical violations.
Selectors use accessible roles and names, so visual restyling should preserve them.

Browser tests freeze the calendar and seed card shuffles while leaving animation
and shuffle timers running. Unit tests likewise freeze only `Date` by default;
`daily-rollover.test.ts` enables full fake timers to cross local midnight, DST,
and New Year boundaries. Run it under the CI timezone matrix to exercise both
hemispheres' DST transitions.

CI retains `playwright-report/` and `test-results/`, including failed-test traces,
screenshots, videos, exported posters, and axe results. Unit-test jobs separately
retain verbose output and JUnit XML in `test-results/vitest/`. For local JUnit
output, run `CI=true npm test`.
