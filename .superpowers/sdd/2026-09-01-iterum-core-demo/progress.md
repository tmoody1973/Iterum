# SDD ledger — plan: docs/superpowers/plans/2026-09-01-iterum-core-demo.md

## Pre-flight interface scan

| Tasks | Produce / consume boundary | Finding |
|---|---|---|
| 1 → 4, 5, 6, 7 | Next.js shell, scripts, CSS, and test harness feed every UI task | Clean; later tasks extend rather than replace the scaffold. |
| 2 → 4, 5, 6 | `WorkspaceRuntime`, snapshot hook, and ephemeral UI store drive shell, canvas, review, and WebMCP | Clean; canonical state remains outside Zustand. |
| 3 → 4, 5 | Raster materials and locked references feed shell and canvas | Clean; asset paths must be reflected in demo data after production. |
| 4 → 5, 6, 7 | Workspace shell exposes center and right-side integration slots | Clean; ownership is component-scoped. |
| 5 → 6, 7 | Mechanical consumes canonical board items and later reflects review mutations | Clean; task 6 dispatches through the runtime rather than mutating Konva. |
| 6 → 7 | Review and WebMCP flows become the browser demo tested by Playwright | Clean; fallback state is testable without host support. |
| 1 | Root layout test versus emitted direction contract | Conflict: React JSX comments do not survive rendering as direct body comments. |
| 2 | Command tests versus reducer contract | Clean; exact +1 version and idempotent replay are compatible. |
| 3 | Generated raster requirement versus no image API keys | Clean; harness-native image generation is available. |
| 4 | Fixed comp reproduction versus responsive shell | Clean; comp breakpoint is authored first and narrower modes follow later. |
| 5 | Konva direct manipulation versus canonical runtime | Clean; all committed transforms dispatch commands. |
| 6 | Strict browser schemas versus no runtime browser parser | Clean for this slice; pure command validation remains authoritative and tests cover schema shape. |
| 7 | Finish documentation versus no pre-build `DESIGN.md` | Clean; documentation deliberately follows the shipping render. |

Ruling: Task 1 will place a first-child inline direction-contract marker in `<body>` that inserts the exact HTML comment before itself at runtime, and the seed will also remain present in built output for audit. This is the closest App Router-compatible fulfillment without replacing Next’s document renderer; if finish review rejects it, middleware injection is the escalation path. Cost if wrong: one small root-layout revision.

Ruling: The first implementation slice uses the in-memory `WorkspaceRuntime` as an explicit demo repository. It is replaceable by Postgres and never stored in Zustand. Cost if wrong: persistence does not survive refresh until the later durable-adapter slice.

## Task 1

Task 1 review: reviewer reported one Important finding that the contract contains six labels rather than five.

Ruling: The approved Impeccable contract requires five core blocks—THESIS, OWN-WORLD, STORY, FIRST VIEWPORT, and FORM—followed by the separately mandated FINISH line. The design spec records all six lines verbatim, and `app/layout.tsx` matches it. Removing FINISH would violate the source spec, so the reviewer finding is adjudicated false. Cost if wrong: finish review may request a wording adjustment, but no downstream interface depends on the count.

Task 1: complete — commit 44297d887460eff9fcc9d88e16585975dad86dcc; typecheck, Vitest baseline, production build, and seed audit passed.

## Task 2

Task 2: fix round 1/5 (2 addressed, 0 open — Agent Additions policy validation; idempotent replay notifications; commits ebdce5f..75f11ee)

Task 2: complete — commits ebdce5f and 75f11ee; 8 domain/runtime tests and typecheck passed; scoped re-review found no new Critical/Important breakage.

## Task 3

Task 3: complete — commit 0d573b8; visual QA and provenance scan passed (`5 rasters, 0 missing`); independent review found 0 Critical, 0 Important, and 0 Minor issues.

## Task 4

Task 4: fix round 1/5 (2 addressed, 0 open — canonical V03 seed/display; authored SVG icon treatment; commits fb51dc1..1b744da).

Task 4: complete — commits fb51dc1 and 1b744da; semantic shell test, domain tests, and typecheck passed; scoped re-review found no new Critical/Important breakage.

Maintenance: commit 2440787 records the Next.js-generated AGENTS.md/CLAUDE.md guidance required by the installed framework version.

## Task 5

Ruling: Task 5 added canonical `resize-board-item` support because Transformer dimensions cannot live only in Konva without violating the runtime-as-source-of-truth architecture. The command is versioned, lock-aware, receipt-producing, and undoable. Cost if wrong: one domain-command revision; leaving it local would create unrecoverable board-state drift.

Task 5: fix round 1/5 (3 Important + 1 Minor addressed — keyboard resize parity, canvas provenance labels, failed-mutation rollback, null selection; commits ee0685d..6fbd757).

Task 5: fix round 2/5 (1 addressed, 0 open — stale conflict rollback now reads the latest runtime snapshot; commit d753b10).

Task 5: complete — commits ee0685d, 6fbd757, and d753b10; 16 mechanical/domain tests, typecheck, and production build passed; scoped re-review found no open or new Critical/Important issues.

## Task 6

Ruling: current WebMCP `registerTool()` is asynchronous and the standardized annotations are `readOnlyHint` and `untrustedContentHint`; Iterum awaits sequential registration, aborts partial failure, and uses the execution AbortSignal shape from the current specification.

Ruling: an agent cannot inherit designer authority merely by invoking WebMCP. Agent approval requires the explicit direct-placement policy and is forced to `Agent Additions`; agent rejection is denied; agent undo is limited to its own receipts. UI designer actions remain unrestricted within canonical version checks.

Task 6: fix round 1/5 (4 Important + 1 Minor addressed — authorship boundary, strict public-URL/schema validation, atomic registration cleanup, untrusted annotations, unused helper; commits a9b4776..ab49c01).

Task 6: fix round 2/5 (1 addressed, 0 open — negative board-version validation parity; commit 77339ab).

Task 6: complete — commits a9b4776, ab49c01, and 77339ab; focused review/WebMCP/domain tests, typecheck, and production build passed; scoped re-review found no open or new Critical/Important issues.

## Task 7

Task 7: review fix round 1 — mobile receipt/Undo parity, drawer-boundary scrolling, viewport-change review-first state, expanded-state/focus restoration, and browser-failure assertions addressed. Existing production screenshots and the one-time detector result were preserved; final checks pending commit.
