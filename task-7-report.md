# Task 7 browser proof

## Red / green

- Green — wide desktop retains the Campaign Job Ticket, Working Mechanical, and Review Tray as three persistent zones.
- Green — approving `proposal-resin` changes V03 → V04, places the proposal on the Board Outline, records a receipt, and Undo returns the board to three items with the proposal pending.
- Green — no `document.modelContext` renders the explicit `WebMCP preview` status.
- Green — at widths below 1050px the Brief and Review Tray are named dockable drawers; the mechanical remains the underlying primary surface.
- Green — at 390px the Review Tray opens by default, provenance is visible, Brief is accessible, and Board preview explicitly says that canvas editing continues on desktop.

## Evidence

- Hero reproduction: `.impeccable/review/hero-repro.png` — 1536 × 1024; inspected against `.impeccable/mocks/decision/model-pick.webp` for the three-zone topology, wheat/paper material, carbon chrome, blue construction marks, taped poster, and proposal rail.
- Desktop: `.impeccable/review/desktop.png` — 1280 × 900.
- Mobile: `.impeccable/review/mobile.png` — 390 × 844.
- All three PNGs were validated with `sips`; dimensions match the captured viewports.
- Final evidence was recaptured from the production build at `http://127.0.0.1:3333`, after the receipt-layer correction, so it contains no Next.js development badge. The detector belongs to the earlier capture pass; it was intentionally not rerun after this production recapture.

## Live browser checks

- Isolated Playwright/Chromium profile against `http://127.0.0.1:3000`.
- Console errors/warnings: 0.
- Failed network responses: 0.
- Accessibility: the phone review tray was visible by default; 12 button controls and 170 nodes in Chrome's accessibility tree were present. Named landmarks and the three-zone flow are asserted in E2E.
- Next dev origin: `allowedDevOrigins: ['127.0.0.1']` matches the local proof host; no browser-side origin warning observed.

## Detector

- Command (ran once in the initial capture pass): `node /Users/tarikmoody/.agents/skills/impeccable/scripts/detect.mjs --json app/globals.css components/iterum-workspace.tsx components/campaign-job-ticket.tsx components/review/review-tray.tsx components/top-toolbar.tsx`
- Result: `[]` (no mechanical findings).

## Checks

- `npm run typecheck` — pass.
- `npm test` — pass, 26 tests.
- `npm run test:e2e` — pass, 4 tests.
- `npm run build` — pass.

## Commit

- `d3395b9d472aa965c3510d5ae417f23dba3b76c7` — `Finish Iterum browser proof`.
- `eea495c` — `Fix Iterum browser review findings`; post-fix typecheck, 26 unit tests, 4 E2E tests, and build passed. The three evidence PNGs were then recaptured from this production build at the same required viewports and manually validated.

## Concerns

- The terminal itself emits Node `NO_COLOR` / `FORCE_COLOR` environment warnings while Playwright starts its server; they are not browser console warnings and do not appear in the application capture.
