# Iterum Core Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-quality, local-first Iterum demo that reproduces the approved Working Mechanical comp and demonstrates agent proposal → designer approval → board placement → receipt → undo through both UI and WebMCP tools.

**Architecture:** Next.js App Router renders the semantic shell and a client-only React Konva canvas. A framework-neutral `WorkspaceRuntime` owns the demo’s canonical in-memory state and pure versioned commands; React reads snapshots with `useSyncExternalStore`, while Zustand owns only transient UI state. Human controls and WebMCP registrations call the same runtime command surface.

**Tech Stack:** Next.js 16.3.3, React/React DOM 19.2.8, TypeScript 7.0.2, React Konva 19.2.5, Konva 10.3.2, Zustand 5.0.15, Zod 4.5.4, Vitest 4.1.11, Playwright 1.62.1, CSS, generated raster assets with prompt provenance.

**Spec:** `docs/plans/2026-09-01-iterum-design.md`

## Global Constraints

- The approved spatial contract is `.impeccable/mocks/decision/model-pick.webp` at 1536×1024.
- The root layout must emit the five-block direction contract and seed `a6558f37` as the first child of `<body>`.
- The center mechanical remains the largest continuous region at every editing breakpoint.
- Agent-found items enter the Review Tray unless an explicit scoped direct-placement grant exists.
- Locked references cannot be moved, deleted, or replaced by agent commands.
- Postgres is the future durable store; Zustand must never own canonical campaign or board data.
- All essential brief, review, provenance, approval, receipt, and undo controls remain semantic DOM.
- WebMCP registration is optional browser capability: missing `document.modelContext` must produce a visible Preview state without breaking the app.
- Every shipping raster requires an embedded prompt or `.json` provenance sidecar.
- No collaboration, billing, production artwork generation, external provider credentials, or phone canvas editing in this plan.

---

### Task 1: Bootstrap the verified application and test harness

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `next-env.d.ts`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Modify: `.gitignore`

**Interfaces:**
- Produces: Next.js App Router entry points, `npm run dev`, `npm run typecheck`, `npm test`, and `npm run build`.

- [ ] **Step 1: Write package scripts and pin core dependencies**

```json
{
  "name": "iterum",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 2: Install the pinned runtime and development packages**

Run: `npm install next@16.3.3 react@19.2.8 react-dom@19.2.8 react-konva@19.2.5 konva@10.3.2 zustand@5.0.15 zod@4.5.4 lucide-react`

Run: `npm install -D typescript@7.0.2 @types/node @types/react @types/react-dom vitest@4.1.11 jsdom @testing-library/react @testing-library/jest-dom @playwright/test@1.62.1`

- [ ] **Step 3: Read the installed Next.js agent guidance before application code**

Run: `find node_modules/next/dist/docs -type f | sort | head -80`

Read the guides covering App Router layouts/pages, client components, dynamic imports with `ssr: false`, metadata, CSS, and image/static asset handling. Follow deprecation notices from the installed version.

- [ ] **Step 4: Add the root layout contract and minimal page smoke test**

The first child of `<body>` must be the emitted HTML comment containing the exact contract from the spec. `app/page.tsx` initially renders `<main data-testid="iterum-workspace">Iterum</main>`.

- [ ] **Step 5: Verify baseline**

Run: `npm run typecheck && npm test && npm run build`

Expected: all commands exit 0 and the built output contains `a6558f37`.

- [ ] **Step 6: Commit**

Run: `git add package.json package-lock.json tsconfig.json next.config.ts next-env.d.ts vitest.config.ts vitest.setup.ts app .gitignore && git commit -m "Bootstrap Iterum application"`

---

### Task 2: Implement versioned domain commands and canonical demo runtime

**Files:**
- Create: `lib/domain/types.ts`
- Create: `lib/domain/demo-data.ts`
- Create: `lib/domain/commands.ts`
- Create: `lib/domain/commands.test.ts`
- Create: `lib/domain/workspace-runtime.ts`
- Create: `lib/domain/workspace-runtime.test.ts`
- Create: `lib/domain/demo-runtime.ts`
- Create: `hooks/use-workspace-snapshot.ts`
- Create: `stores/ui-store.ts`

**Interfaces:**
- Produces: `WorkspaceState`, `WorkspaceCommand`, `CommandResult`, `applyWorkspaceCommand(state, command)`, `WorkspaceRuntime.dispatch(command)`, `demoRuntime`, `useWorkspaceSnapshot()`, and `useUiStore`.

- [ ] **Step 1: Write failing command tests**

Cover these exact behaviors:

```ts
expect(approveResult.ok).toBe(true);
expect(approveResult.state.version).toBe(initial.version + 1);
expect(approveResult.state.proposals.find((item) => item.id === "proposal-resin")?.status).toBe("approved");
expect(approveResult.state.boardItems.some((item) => item.sourceProposalId === "proposal-resin")).toBe(true);
expect(approveResult.receipt?.undoable).toBe(true);
```

Also assert `VERSION_CONFLICT`, locked-reference protection, rejection without placement, idempotency-key replay, explicit direct-placement policy, receipt insertion, and compensating undo.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- lib/domain/commands.test.ts`

Expected: FAIL because the domain modules do not exist.

- [ ] **Step 3: Define focused domain types**

`WorkspaceState` includes `campaign`, `version`, `placementPolicy`, `boardItems`, `proposals`, `receipts`, and bounded `processedCommands`. Commands are a discriminated union for `approve-proposal`, `reject-proposal`, `propose-reference`, `set-placement-policy`, `move-board-item`, and `undo-receipt`; every mutation carries `expectedVersion` and `idempotencyKey`.

- [ ] **Step 4: Implement the pure command reducer**

`applyWorkspaceCommand` must not mutate its input. Success increments the version exactly once and prepends one `ActionReceipt`; conflicts and validation failures return structured error codes without changing state. Use `crypto.randomUUID()` for receipt and placed-item IDs.

- [ ] **Step 5: Implement and test `WorkspaceRuntime`**

```ts
export interface WorkspaceRuntime {
  getSnapshot(): WorkspaceState;
  subscribe(listener: () => void): () => void;
  dispatch(command: WorkspaceCommand): CommandResult;
}
```

The runtime stores the current demo snapshot, delegates every mutation to `applyWorkspaceCommand`, and notifies subscribers only after successful state changes.

- [ ] **Step 6: Keep Zustand ephemeral**

`useUiStore` owns `selectedBoardItemId`, `activeRightTab`, `activeTool`, `webMcpStatus`, and drawer visibility. It must not contain `WorkspaceState`, proposals, board items, or receipts.

- [ ] **Step 7: Verify and commit**

Run: `npm test -- lib/domain && npm run typecheck`

Run: `git add lib/domain hooks stores && git commit -m "Add Iterum versioned workspace runtime"`

---

### Task 3: Produce and record the visual materials

**Files:**
- Create: `public/assets/paper-grain.webp`
- Create: `public/assets/tape-strip.webp`
- Create: `public/assets/ref-wet-concrete.webp`
- Create: `public/assets/ref-resin-iris.webp`
- Create: `public/assets/ref-type-study.webp`
- Create: matching `.json` provenance sidecars for every raster
- Create: `public/assets/README.md`

**Interfaces:**
- Produces: stable local asset URLs used by `demo-data.ts` and the visual components.

- [ ] **Step 1: Generate one seamless wheat paper texture and one translucent amber tape texture**

The assets must match the approved comp’s material depth without containing interface text, logos, or UI chrome. Tape requires a transparent background or a documented blend/crop treatment.

- [ ] **Step 2: Generate the three synthetic locked references**

Produce separate high-resolution images for wet concrete reflecting distorted sodium light, crushed iris suspended in clear resin, and an asymmetrical typographic study with extreme scale contrast. These are fictional demonstration assets, not claimed client work.

- [ ] **Step 3: Embed provenance immediately**

Run `embed-prompt.mjs` with the exact generation prompt for each file. `public/assets/README.md` records dimensions, crop intent, and whether the file is generated or authored.

- [ ] **Step 4: Verify inventory**

Run: `node /Users/tarikmoody/.agents/skills/impeccable/scripts/embed-prompt.mjs --scan public/assets`

Expected: `0 missing`.

- [ ] **Step 5: Commit**

Run: `git add public/assets && git commit -m "Add Iterum campaign materials"`

---

### Task 4: Reproduce the semantic shell and campaign job ticket

**Files:**
- Create: `components/iterum-workspace.tsx`
- Create: `components/top-toolbar.tsx`
- Create: `components/campaign-job-ticket.tsx`
- Create: `components/bottom-mode-bar.tsx`
- Create: `components/webmcp-status.tsx`
- Create: `components/workspace-shell.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `demoRuntime`, `useWorkspaceSnapshot()`, `useUiStore`.
- Produces: `IterumWorkspace`, stable landmark labels, and CSS variables sampled from the approved comp.

- [ ] **Step 1: Write the failing semantic-shell test**

Assert the page exposes an Iterum banner, a `Campaign job ticket` complementary landmark, a `Working mechanical` main region, a `Review tray` complementary landmark, visible Static Bloom brief text, and WebMCP status text.

- [ ] **Step 2: Run test and verify failure**

Run: `npm test -- components/workspace-shell.test.tsx`

- [ ] **Step 3: Implement the 1536×1024 reproduction skeleton**

Use a fixed black top toolbar, three-column work area near `19.5% / minmax(0, 58%) / 22.5%`, and black bottom mode bar. At desktop sizes, panels remain flush production surfaces rather than floating cards.

- [ ] **Step 4: Implement the job ticket**

Render campaign, line, notes, deliverables, anti-directions, locked state, and version history with semantic headings, definition lists, and buttons. Match the approved comp’s measured rules and production-label hierarchy.

- [ ] **Step 5: Add material CSS without faking raster texture**

Use `paper-grain.webp` as the visible material layer. Use authored CSS/SVG only for geometry: rules, crop targets, focus rings, and registration marks. Do not replace raster grain or tape with gradients.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- components/workspace-shell.test.tsx && npm run typecheck`

Run: `git add app components && git commit -m "Build Iterum production desk shell"`

---

### Task 5: Build the interactive React Konva mechanical with DOM parity

**Files:**
- Create: `components/mechanical/mechanical-canvas-loader.tsx`
- Create: `components/mechanical/mechanical-canvas.tsx`
- Create: `components/mechanical/reference-node.tsx`
- Create: `components/mechanical/board-outline.tsx`
- Create: `components/mechanical/mechanical-toolbar.tsx`
- Create: `components/mechanical/mechanical.test.tsx`
- Create: `hooks/use-container-size.ts`
- Modify: `components/iterum-workspace.tsx`

**Interfaces:**
- Consumes: `WorkspaceState.boardItems`, `WorkspaceRuntime.dispatch`, and UI selection state.
- Produces: client-only dynamic `MechanicalCanvas`, drag/selection transforms, and an accessible board outline.

- [ ] **Step 1: Write failing interaction tests for the DOM mirror**

Assert three locked references are listed, selecting an outline item updates UI selection, keyboard move dispatches `move-board-item`, and locked items expose no enabled delete action.

- [ ] **Step 2: Implement client-only Konva loading**

`mechanical-canvas-loader.tsx` is a client component using `next/dynamic` with `{ ssr: false }`. The canvas implementation lives outside `app/` and imports `Stage`, `Layer`, `Image`, `Rect`, `Text`, and `Transformer` from `react-konva`.

- [ ] **Step 3: Render board nodes in array order**

Do not use Konva `zIndex`; render node order from canonical `boardItems`. Every draggable positioned node must persist position in `onDragEnd`. Transformer commits bake `scaleX/scaleY` into width/height and reset scale to 1.

- [ ] **Step 4: Protect locked items and preserve provenance labels**

Locked references can be selected and inspected but not dragged, transformed, deleted, or replaced. Each reference shows filename, source class, and a non-color lock mark.

- [ ] **Step 5: Add the semantic board outline**

The DOM outline lists every canvas item, position, size, lock state, source, and available keyboard actions. It remains visually compact but fully operable when the canvas is unavailable.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- components/mechanical && npm run typecheck && npm run build`

Run: `git add components/mechanical hooks/use-container-size.ts components/iterum-workspace.tsx && git commit -m "Add interactive Iterum mechanical"`

---

### Task 6: Connect Review Tray, action receipts, Undo, and WebMCP tools

**Files:**
- Create: `components/review/review-tray.tsx`
- Create: `components/review/proposal-card.tsx`
- Create: `components/review/action-receipt.tsx`
- Create: `components/review/review-flow.test.tsx`
- Create: `types/webmcp.d.ts`
- Create: `lib/webmcp/types.ts`
- Create: `lib/webmcp/register-tools.ts`
- Create: `lib/webmcp/register-tools.test.ts`
- Create: `hooks/use-webmcp-tools.ts`
- Modify: `components/iterum-workspace.tsx`

**Interfaces:**
- Consumes: `WorkspaceRuntime.getSnapshot()` and `.dispatch()`.
- Produces: Review Tray UI and `registerIterumTools(runtime): { controller: AbortController; count: number } | null`.

- [ ] **Step 1: Write failing end-to-end component tests**

Test Approve places the proposal on the board, increments one version, marks the proposal approved, and shows a receipt with Undo. Test Reject records a decision without placing. Test Undo restores the preceding snapshot through a compensating command.

- [ ] **Step 2: Implement the review components**

Each proposal shows image preview, title, source page, attribution, rights status, rationale, intended territory, Reject, and Approve. Approval previews its target and then dispatches one domain command. Receipts expose actor, action, board version, timestamp, and Undo availability.

- [ ] **Step 3: Add the local optional browser declaration**

```ts
interface WebMCPTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(input: unknown, context: { signal: AbortSignal }): Promise<unknown> | unknown;
  annotations?: Record<string, boolean>;
}
```

Augment `Document` with optional `modelContext.registerTool(tool, { signal?, exposedTo? })`.

- [ ] **Step 4: Register five strict tools through the shared runtime**

Implement `get_campaign_context`, `propose_reference`, `approve_reference`, `reject_reference`, and `undo_action`. Mutation schemas require `expectedBoardVersion` and `idempotencyKey`, use `additionalProperties: false`, and return a shared versioned success/error envelope. Consequence annotations must accurately mark reads, mutations, external/untrusted inputs, and idempotency.

- [ ] **Step 5: Add registration lifecycle and fallback UI**

Feature-detect `document.modelContext`. Register sequentially with one `AbortController`, report `ready`, `preview`, or `error` through `useUiStore`, and abort on cleanup. A missing API is a normal Preview state, not an error.

- [ ] **Step 6: Test registration, cleanup, conflicts, and receipts**

Mock `document.modelContext.registerTool`, capture tool definitions, run tool `execute` methods, and assert strict registration count, cleanup signal abort, unsupported fallback, `VERSION_CONFLICT`, and UI-visible receipt insertion.

- [ ] **Step 7: Verify and commit**

Run: `npm test -- components/review lib/webmcp && npm run typecheck && npm run build`

Run: `git add components/review types lib/webmcp hooks/use-webmcp-tools.ts components/iterum-workspace.tsx && git commit -m "Add Iterum review and WebMCP flow"`

---

### Task 7: Responsive behavior, browser proof, and Impeccable finish

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/iterum-demo.spec.ts`
- Modify: `app/globals.css`
- Modify: implementation files identified by visual review
- Create: `.impeccable/review/hero-repro.png`
- Create: `.impeccable/review/desktop.png`
- Create: `.impeccable/review/mobile.png`
- Create after finish review: `DESIGN.md` and its Impeccable sidecar

**Interfaces:**
- Produces: verified desktop demo, review-first phone layout, visual evidence, finish verdict, and documented shipping system.

- [ ] **Step 1: Write the Playwright demo flow**

At desktop width, load Iterum, confirm three zones, approve `proposal-resin`, assert board version increments and receipt appears, click Undo, and assert the proposal returns to pending. In a second test, validate Preview mode when WebMCP is unavailable.

- [ ] **Step 2: Implement responsive boundaries**

At narrower desktop widths, brief and tray become dockable drawers while canvas remains primary. At phone width, default to Review Tray with access to brief and provenance; do not pretend to provide full canvas editing.

- [ ] **Step 3: Run complete automated verification**

Run: `npm run typecheck && npm test && npm run test:e2e && npm run build`

- [ ] **Step 4: Prove the approved viewport before polishing**

Capture 1536×1024 to `.impeccable/review/hero-repro.png`, open it beside `.impeccable/mocks/decision/model-pick.webp`, and compare topology, scale, material, density, and accent values. Fix all material gaps in one batch.

- [ ] **Step 5: Run one bounded desktop/mobile inspection**

Capture `.impeccable/review/desktop.png` and `.impeccable/review/mobile.png`, validate both files, then run `detect.mjs --json` once and fix mechanical findings.

- [ ] **Step 6: Run the Impeccable finish reviewer**

Provide the original request, approved comp, direction contract, screenshots, craft-floor path, surface brief, and detector findings. Follow its exact `ship`, `fix`, `rebuild`, or `recapture` disposition within the two-round ceiling.

- [ ] **Step 7: Document the built system**

After the final correction, run the Impeccable documenter to create `DESIGN.md` and its sidecar from the shipping implementation. Rescan every shipping raster for provenance.

- [ ] **Step 8: Final verification and commit**

Run: `npm run typecheck && npm test && npm run test:e2e && npm run build`

Run: `node /Users/tarikmoody/.agents/skills/impeccable/scripts/embed-prompt.mjs --scan public/assets`

Run: `git add . && git commit -m "Finish Iterum core demo"`

---

## Self-review receipt

- **Spec coverage:** The plan covers the three-zone workspace, locked references, review-default policy, direct-placement boundary, approval placement, receipts, Undo, WebMCP lifecycle, accessible DOM parity, responsive review mode, provider-safe domain boundaries, visual fidelity, testing, and provenance. External provider calls and durable Postgres/R2 adapters remain explicit future slices rather than hidden placeholders.
- **Placeholder scan:** No `TBD`, `TODO`, “similar to,” or unspecified error-handling steps remain.
- **Type consistency:** UI and WebMCP both consume `WorkspaceRuntime`; state changes use `WorkspaceCommand`; results use `CommandResult`; the browser integration exports `registerIterumTools(runtime)`; Zustand owns only `UiState`.
