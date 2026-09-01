# Task 5 — Interactive Iterum mechanical

## Changed files

- `components/mechanical/mechanical-canvas-loader.tsx`
- `components/mechanical/mechanical-canvas.tsx`
- `components/mechanical/reference-node.tsx`
- `components/mechanical/board-outline.tsx`
- `components/mechanical/mechanical-toolbar.tsx`
- `components/mechanical/mechanical.test.tsx`
- `hooks/use-container-size.ts`
- `components/iterum-workspace.tsx`
- `app/globals.css`
- `lib/domain/types.ts`, `lib/domain/commands.ts`, and `lib/domain/commands.test.ts`

## Red / green evidence

- Added DOM-mirror interaction coverage for locked provenance, UI selection, keyboard movement, and disabled delete controls. The first test pass exposed ambiguous controls and missing test isolation; selection controls now have explicit accessible names and cleanup occurs after each test.
- Added focused command coverage before final verification for resize persistence and locked resize rejection.
- Green: `npm test -- components/mechanical` — 3 passing tests.
- Green: `npm run typecheck`.
- Green: `npm run build`.

## Interface adjustment

The mechanical needs canonical resize persistence, so Task 5 extends the versioned command interface with `resize-board-item`. It applies expected-version/idempotency/actor checks, rejects locked items, records an undo effect, and lets Transformer bake scale into width/height before resetting scale to one. This prevents canvas-only size drift.

## Checks

- `/usr/local/bin/npm test -- components/mechanical`
- `/usr/local/bin/npm run typecheck`
- `/usr/local/bin/npm run build`
- `git diff --check`

## Commit

`d315d8e` — `Add interactive Iterum mechanical`

## Concerns

- The board outline is deliberately always available as the keyboard and assistive-technology equivalent of the canvas. Review Tray and WebMCP actions remain deferred.
