# Task 6 report — Review and WebMCP flow

## Result

Implemented the Review Tray, action receipts with compensating Undo, and five local WebMCP tools backed exclusively by the shared `WorkspaceRuntime` command layer.

## Red → green evidence

- Red: review-flow test initially exposed cross-test DOM cleanup; corrected with explicit cleanup.
- Green: `/usr/local/bin/npm test -- components/review lib/webmcp` — 2 files, 4 tests passed.
- Green: `/usr/local/bin/npm run typecheck`.
- Green: `/usr/local/bin/npm run build`.

## Files

- `components/review/review-tray.tsx`, `proposal-card.tsx`, `action-receipt.tsx`, and flow tests.
- `lib/webmcp/types.ts`, `register-tools.ts`, and registration tests.
- `types/webmcp.d.ts`, `hooks/use-webmcp-tools.ts`.
- `components/iterum-workspace.tsx` and review-specific `app/globals.css` styling.

## WebMCP compatibility correction

The local declaration now matches the current WebMCP shape: `registerTool` returns `Promise<undefined>` and registration is awaited sequentially. Tool execution accepts `(input, { signal })`; cleanup aborts the single registration controller. Only standardized `readOnlyHint` and `untrustedContentHint` annotations are declared. Registration uses `{ signal }` without an `exposedTo: ['assistant']` origin-invalid value. Missing `document.modelContext` stays the normal Preview state.

## Safety and concerns

- All write tools require `expectedBoardVersion` and `idempotencyKey`, use strict schemas, return a shared versioned success/error envelope, and dispatch shared runtime commands.
- Proposed source/image URLs are runtime-validated as HTTP(S); rendered source links use `target="_blank" rel="noreferrer"`.
- The designer-controlled direct-placement toggle is off by default, creates a receipt, and remains constrained by the existing domain rule to `Agent Additions`.
- No provider/network calls were introduced. Commit hash: pending.

## Review fix round 1/5

- Addressed: 5 (all 4 Important findings and the unused-helper Minor); open: 0; new: 0.
- Agent approval now requires the canonical direct-placement policy, is forced to `Agent Additions`, and reports that actual territory in its receipt. Agent rejection is a non-mutating `DESIGNER_REVIEW_REQUIRED` review request; agents may only undo receipts they created.
- Runtime input parsing now rejects unknown top-level/nested fields, non-finite or over-specified points, credentialed/malformed/private/loopback/link-local URLs, and invalid proposal input before dispatch.
- All five tools are marked untrusted where their output can contain sourced content; read-only semantics now reflect the non-mutating rejection request.
- Registration aborts the shared controller on partial failure; tests assert the exact signal supplied to every registration and lifecycle-unmount cleanup.
- Verification: `/usr/local/bin/npm test -- components/review lib/webmcp lib/domain` (18 passed), `/usr/local/bin/npm run typecheck`, and `/usr/local/bin/npm run build`.

## Review fix round 2/5

- Addressed: 1; open: 0; new: 0.
- `expectedBoardVersion` now requires a finite integer at least zero before any mutation dispatch, matching the declared JSON Schema minimum. Negative-version coverage confirms a `VALIDATION_ERROR` and no state change.
- Verification: `/usr/local/bin/npm test -- lib/webmcp lib/domain` (16 passed), `/usr/local/bin/npm run typecheck`, and `/usr/local/bin/npm run build`.
