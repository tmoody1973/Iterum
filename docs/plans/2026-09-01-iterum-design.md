# Iterum MVP Design

**Date:** 2026-09-01  
**Status:** Approved for implementation  
**Visitor mode:** Operate  
**Approved direction:** Paste-up Proofing Desk / Working Mechanical  
**Approved comp:** `.impeccable/mocks/decision/model-pick.webp`

## Product outcome

Iterum is a campaign-direction workspace for one professional graphic designer. It converts a brief and a few locked references into a sourced, reviewable visual direction. The product’s defining moment is not an AI response: it is an agent-found proposal moving from the Review Tray onto the shared board after explicit designer approval, followed by a readable and reversible action receipt.

The MVP uses the synthetic **Static Bloom** fragrance campaign. The initial board contains three locked references, a campaign brief, and empty room for new material. The designer can search, capture, crop, upload, annotate, compare color and type, organize visual territories, and export a direction brief. Finished campaign artwork remains outside the MVP.

## Approved experience

The first viewport is a wide production table with three persistent zones:

1. **Campaign Job Ticket** — a narrow left ledger containing the brief, deliverables, constraints, attachments, and locked campaign facts.
2. **Working Mechanical** — the dominant center canvas, rendered with React Konva, containing references, type specimens, palette strips, notes, annotations, and territory frames.
3. **Proposal Galley** — a right rail with Review Tray and Agent Activity tabs. Proposals carry their source, attribution, rights state, rationale, and intended territory.

Approving a proposal visibly “waxes it down” onto the mechanical. The destination appears before commit; after commit, the placed reference, board version, coordinates, and Undo action appear in a compact receipt. The agent never bypasses this review step unless the designer explicitly enables direct placement for the board or current request. Direct placements land in a named **Agent Additions** area.

## Visual system

The world comes from pre-digital editorial paste-up and repro-camera production without becoming nostalgic scrapbook decoration. The approved comp is the spatial authority.

- Warm wheat layout-board fields with real paper grain.
- Carbon-black application chrome and ink.
- Non-photo blue for construction marks, selection, and editable geometry.
- Ruby red for review marks and warnings.
- Approval green only for an active, valid commit or completed receipt.
- Amber tape and registration marks as functional attachment and alignment cues.
- Condensed grotesk display typography against small monospaced production labels.
- Fine measured rules, crop targets, filename-like labels, and sparse pencil annotations.
- Mostly square geometry; shallow physical layering comes from paper, tape, and mounted specimens rather than generic card shadows.

Sampled implementation anchors from the approved comp are wheat paper `#D0C7BA`, darker work surface `#B3A590`, chrome/ink `#171717`, non-photo blue near `#4779B8`, approval green near `#217A3A`, and muted ruby near `#A05040`. Final tokens must be verified against same-size screenshots, because texture changes the net rendered color.

## Components and ownership

- **App shell:** semantic HTML navigation, project status, view controls, and bottom mode switcher.
- **Brief ledger:** semantic form and disclosure controls; no essential brief content is trapped in canvas pixels.
- **Konva board:** spatial placement, selection, transforms, territory frames, crop previews, and direct manipulation.
- **Accessible board outline:** DOM list mirroring every important canvas item and action for keyboard and assistive-technology access.
- **Review Tray:** semantic proposal list with provenance, rights evidence, rationale, destination preview, Approve, and Reject.
- **Action Receipt:** immutable mutation summary with version, actor, effect, and available Undo.
- **Provider search:** normalized tabs for Unsplash, broad web discovery, fonts, and submitted URLs.
- **Crop studio:** original URL capture beside an editable crop; original asset and crop coordinates remain separate.
- **Color and type tools:** deterministic color extraction plus editable role labels; Fontsource-first search with reference-only commercial recommendations clearly separated.

Postgres is canonical. Zustand owns only transient selections, open panels, tool modes, drag state, and optimistic presentation. Konva nodes are projections of canonical board items rather than a second database.

## Command and data flow

Human actions and WebMCP tools call the same domain-command layer. Every write includes campaign ID, board ID, expected board version, idempotency key, actor, and typed payload. A successful command commits the domain change and action receipt together, then returns the new board version and a minimal UI patch.

Agent discovery first creates normalized proposal records. Approval creates a placement command; rejection records a decision without mutating the board. Direct placement uses the same command with an explicit policy grant and constrained destination. Undo creates a compensating command rather than deleting history.

Provider payloads are normalized server-side. Unsplash selections preserve attribution and trigger required download tracking. SerpAPI results preserve source-page and rights evidence but remain reference-only when reuse rights are uncertain. URL capture blocks private-network destinations and never makes a failed fetch look like a blank successful asset.

## Errors and important states

- **Provider unavailable:** keep the query and filters, show cached or partial results, and allow retry without creating duplicate proposals.
- **Capture blocked or authenticated:** preserve the submitted URL and explain why no image was produced; offer manual screenshot upload.
- **Board version conflict:** pause the placement, refresh canonical state, and offer a safe retry with the intended destination still visible.
- **Rights uncertain:** allow private reference use with a persistent label; exclude it from public export until verified.
- **Processing:** color extraction, capture, crop generation, and font loading show progress without locking the rest of the board.
- **Undo unavailable:** explain whether the later dependent action, permission boundary, or retention policy prevents reversal.
- **Empty Review Tray:** show the available research actions and current placement policy, not a generic celebration screen.

## Responsive and accessibility boundaries

The authored demo targets a wide desktop first. At narrower widths, the brief and review rail become dockable drawers while the canvas retains the largest continuous region. The MVP does not promise a full phone editing experience; phone layouts prioritize review, approval, provenance, and brief reading.

All non-spatial controls use semantic DOM. Focus, lock, selection, approval, rejection, processing, and error states use text or shape in addition to color. Every canvas mutation has a keyboard-accessible counterpart. Reduced motion replaces the wax-down transition with discrete source, destination, and receipt states.

## Verification

- Schema tests for proposals, references, board items, receipts, rights evidence, and crop coordinates.
- Command tests for idempotency, expected-version conflicts, permission checks, placement policy, lock behavior, and compensating undo.
- Provider contract tests with stored fixtures and malformed responses.
- Security tests for URL-capture network boundaries, credential isolation, file validation, and untrusted metadata.
- Canvas interaction tests for selection, transform persistence, z-order, keyboard alternatives, and projection from canonical state.
- End-to-end tests for search → proposal → approval → placement → receipt → undo.
- Visual tests at the approved 1536×1024 comp size plus the supported narrower desktop and review-only phone layout.
- Accessibility, reduced-motion, and keyboard-only audits before the finish review.

## Direction contract for the root layout

```text
THESIS: Iterum turns sourced agent proposals into designer-approved, reversible paste-up; it refuses the generic infinite whiteboard with a chatbot beside it.
OWN-WORLD: Wheat layout board, carbon-black chrome, non-photo-blue construction marks, muted ruby review notation, approval green, amber tape, crop targets, condensed grotesk type, and monospaced production labels.
STORY: Read the campaign ticket, judge a sourced proposal, preview its destination, approve it onto the mechanical, and retain an undoable action receipt.
FIRST VIEWPORT: A slim job ticket occupies the left, the working mechanical dominates the center, and the proposal galley occupies the right; Approve sits on the active proposal and placement resolves visibly into the board.
FORM: Paste-up Proofing Desk, grounded candidate 1; seed a6558f37.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
```

## Deliberate deferrals

Collaboration, voting, multiplayer presence, production artwork generation, billing, mobile canvas editing, and advanced licensed-font management are out of scope. `DESIGN.md` is intentionally written after the first production build and finish review so it documents the system that actually ships rather than a speculative rulebook.
