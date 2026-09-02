---
name: Iterum
description: A tactile, exact proofing desk for designer-controlled campaign direction.
colors:
  wheat-paper: "#d0c7ba"
  board-stock: "#b3a590"
  carbon-ink: "#171717"
  non-photo-blue: "#4779b8"
  approval-green: "#217a3a"
  review-ruby: "#a05040"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(50px, 6.2vw, 105px)"
    fontWeight: 700
    lineHeight: 0.77
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.015em"
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.1
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "9px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"
rounded:
  square: "0px"
  registration: "50%"
spacing:
  hairline: "1px"
  micro: "4px"
  compact: "8px"
  control: "12px"
  section: "20px"
  chrome: "52px"
components:
  button-approve:
    backgroundColor: "transparent"
    textColor: "{colors.non-photo-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "8px 4px"
  button-approve-hover:
    backgroundColor: "{colors.approval-green}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "8px 4px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "#dddddd"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "8px 4px"
  tool-button:
    backgroundColor: "transparent"
    textColor: "#aaa69e"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 13px"
    height: "52px"
  job-ticket:
    backgroundColor: "{colors.wheat-paper}"
    textColor: "{colors.carbon-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "20px"
  proposal-sheet:
    backgroundColor: "transparent"
    textColor: "#dcd7cd"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "12px"
  action-receipt:
    backgroundColor: "{colors.carbon-ink}"
    textColor: "#e8e4da"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "13px 18px"
  placement-projection:
    backgroundColor: "#dfd8cc"
    textColor: "{colors.non-photo-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "8px"
---

# Design System: Iterum

## Overview

**Creative North Star: "Paste-up Proofing Desk / Working Mechanical"**

Iterum is a contemporary production interface built from the visual logic of pre-digital editorial paste-up and repro-camera work. Carbon application chrome frames a tactile wheat desk; measured rules, registration targets, locked specimens, filename labels, tape, and proofing marks make the workspace feel exact and materially present. It is editorially dense, never decorative nostalgia.

The designer remains visibly in control. Agent research arrives as sourced material in a dark review galley, previews a precise destination on the shared mechanical, and moves onto the board only after approval or an explicit direct-placement grant. Every accepted change resolves into coordinates, a board version, an actor, and a reversible receipt.

**Key Characteristics:**

- Three-zone production topology with the Working Mechanical always dominant.
- Warm paper and mounted-specimen materiality inside carbon-black application chrome.
- Condensed grotesk headlines paired with terse monospaced production metadata.
- Non-photo blue for construction and selection, ruby for review notation, and green reserved for valid approval.
- Semantic controls and ledgers around a spatial Konva projection of canonical board state.
- Square, ruled, tactile, and precise rather than card-based, glossy, or conversational.

## Colors

The palette behaves like a physical proofing environment: quiet stock colors carry most of the field, dark ink establishes authority, and chromatic marks communicate construction or decision state.

### Primary

- **Non-photo Blue:** Use for editable geometry, selected tools, active tabs, destination previews, focus outlines, and active navigation. It is a construction color, not decorative brand wash.

### Secondary

- **Approval Green:** Reserve for a valid committed approval, placed-state label, ready status, or completed receipt check.
- **Review Ruby:** Use for ticket identifiers, campaign proof marks, warnings, and editorial review notation.

### Neutral

- **Wheat Paper:** The recurring job-ticket and proofing-paper ground, always paired with the generated paper-grain asset where the surface is meant to feel physical.
- **Board Stock:** The darker mounted-stock tone behind references and supporting paste-up surfaces.
- **Carbon Ink:** The application chrome, review galley, receipt surface, and primary printed ink.

**The Production-Ink Rule.** Every chromatic accent must name a production state: construction, review, or approval.

**The Green Means Commit Rule.** Approval green appears only after a valid action or in an explicit ready state; it never decorates idle controls.

## Typography

**Display Font:** Barlow Condensed (sans-serif fallback)  
**Body Font:** Barlow (sans-serif fallback)  
**Label/Mono Font:** IBM Plex Mono (monospace fallback)

**Character:** The pairing combines the force of a condensed campaign lockup with the discipline of proof-sheet metadata. Typography should feel set by a working studio: expressive only in the artifact, compressed and factual everywhere else.

### Hierarchy

- **Display** (700, `clamp(50px, 6.2vw, 105px)`, `0.77`): Extreme-scale poster proof headlines; preserve tight leading and slight negative tracking.
- **Title** (500, `30px`, `1`): Campaign names and major ledger headings.
- **Body** (400, `14px`, `1.1`): Short campaign lines and human-readable copy; longer operational text uses the mono label face at a looser line-height.
- **Label** (500, `9px`, `1.4`, `0.04em`): Filenames, dimensions, status, provenance, coordinates, tool names, and control labels; uppercase where the source behaves like production notation.

**The Artifact/Instrument Rule.** Barlow Condensed belongs to campaign artifacts and decisive headings; IBM Plex Mono belongs to the instrument panel, provenance, state, and coordinates.

## Layout

Desktop is a three-zone proofing desk beneath and above fixed carbon chrome. The 52px top and bottom bars frame a narrow Campaign Job Ticket, a dominant Working Mechanical, and a dark Review Tray. At the authored wide desktop, the zones resolve near 19.5% / 58% / 22.5%, separated by narrow black gutters; the center owns the largest continuous field.

At 1050px and below, the center becomes the full desk and the brief and review surfaces become requested edge drawers, each capped at 340px or 88vw. At 760px and below, drawers become full-width, the phone opens review-first, and the canvas, mechanical toolbar, coordinate projection, outline, and desktop receipt are suppressed. The phone supports provenance, approval, Undo, and brief reading; a compact board-preview notice makes clear that canvas editing continues on desktop.

Spatial rhythm is compact and measured: 1px rules, 8–13px control padding, 20px ledger sections, and narrow gutters. Paper regions can scroll, but chrome and mode switching stay stable. Never shrink all three columns into an illegible miniature desktop.

**The Center-Owns-the-Desk Rule.** Any editing layout preserves the Working Mechanical as the largest continuous region; supporting ledgers dock or draw over it before the mechanical is compressed.

**The Review-First Phone Rule.** Phone layouts prioritize the decision boundary and its receipt, not canvas manipulation.

## Elevation & Depth

Depth is shallow and physical. The system is flat at the application level; paper texture, mounted specimens, tape, rules, and restrained shadows explain what is sitting above what. The poster proof, proposed placement, drawers, and action receipt receive small structural shadows. Generic card elevation does not establish hierarchy.

**The Mounted-Paper Rule.** Use elevation only when a surface is physically mounted, docked over the desk, or recording a completed action.

## Shapes

The default geometry is square and measured: zero-radius controls, ruled containers, hard panel edges, crop ticks, and rectangular specimens. Circles are semantic instruments—registration targets, tool glyphs, status dots, and the receipt check—not a general softening device. Tape may be irregular because it represents a real attachment material; interface panels may not imitate torn scrapbook paper.

Borders are hairline and tonal. Dashed non-photo-blue outlines identify an uncommitted destination preview; the same outline becomes solid after placement. Locked state is reinforced with lock icons and explicit text rather than shape or color alone.

**The Square-By-Default Rule.** If an element is not a registration, status, or confirmation instrument, begin with a square silhouette.

## Components

### Application Chrome

- **Style:** Carbon bars use IBM Plex Mono labels, sparse dividers, and strong selected states. The Iterum wordmark uses Barlow Condensed with wide tracking.
- **Tools:** Tool buttons fill the full bar height; hover and active states shift to a slightly lighter carbon panel and white text.
- **Focus:** All keyboard-operable buttons receive a visible non-photo-blue 2px outline with 2px offset.

### Campaign Job Ticket

- **Character:** A dense paper ledger, not a floating card.
- **Structure:** Section rules, paired definition-list facts, locked status, attachments, versions, notes, deliverables, and anti-directions remain semantic DOM.
- **Material:** Wheat stock carries paper grain; ruby marks the ticket ID and current review version.

### Review Tray and Proposal Sheet

- **Character:** A dark proposal galley that exposes the decision before the action.
- **Proposal:** Preview, source page, attribution, rights state, rationale, intended territory, Reject, and Approve appear together inside a thin ruled sheet.
- **Tabs:** Review and Activity are semantic tabs; the selected tab uses white text plus a non-photo-blue underline.
- **Boundary:** The direct-placement checkbox is explicit, versioned, and visibly constrained to Agent Additions.

### Working Mechanical

- **Spatial layer:** React Konva handles selection, drag, transform, locked-reference projection, and destination geometry.
- **Accessible mirror:** A DOM Board Outline lists every item’s title, coordinates, size, source, and lock state. Arrow keys move editable items by 10px; explicit controls resize them by 20px. Locked items remain selectable and inspectable but cannot be resized or deleted.
- **Canonical state:** Konva nodes are projections. Rejected or version-conflicted changes restore the latest runtime geometry rather than preserving stale canvas state.

### Color Studio

- **Local extraction:** The selected board reference is sampled in the browser from either its full image or a fixed center crop. The resulting canonical palette records its source, crop, and deterministic extraction algorithm; saving it is a designer action with an Undo receipt.
- **Systematic variations:** A chosen local swatch may be named and expanded into a bounded scheme through The Color API. These swatches remain suggestions until the designer explicitly pins one.
- **Experimental harmonies:** Colormind suggestions are visibly marked experimental and may be constrained by one or two local swatches. They are reference material only and never write to the board or campaign palette automatically.
- **Tool boundary:** WebMCP exposes extraction and both suggestion paths as read-only tools. It never has authority to save, pin, or replace colors.

### Approval Preview, Wax-Down, and Action Receipt

- **Preview:** Before commit, a dashed non-photo-blue frame appears at the calculated destination, bounded to at least 24px from the measured viewport edge. The frame names the intended territory and exact X/Y coordinate.
- **Commit:** Approval places exactly one board item. The projection changes to a solid outline, labels the waxed coordinates in green, and performs a 540ms wax-down reveal using the shipped emphasized easing.
- **Reduced motion:** When reduced motion is requested, the wax-down animation is removed; preview, placed state, and receipt still communicate the full transition.
- **Receipt:** A carbon receipt records action, summary, actor, new board version, placed coordinates, time, and Undo when compensating reversal is allowed. On phone, this receipt lives inside the Review Tray.

### Bottom Mode Bar

- **Style:** A fixed carbon footer carries project breadcrumbs, production modes, WebMCP state, active tool, saved state, and time.
- **Responsive:** Phone preserves the production modes and WebMCP state while dropping low-priority breadcrumbs and status detail.

## Do's and Don'ts

### Do:

- **Do** preserve the Campaign Job Ticket / Working Mechanical / Review Tray topology wherever desktop space permits.
- **Do** show source, attribution, rights evidence, rationale, destination, and placement policy before asking for approval.
- **Do** make approval spatially legible as destination preview → explicit approval → waxed placement → coordinate receipt.
- **Do** pair every important Konva action with a keyboard-operable semantic DOM path.
- **Do** retain text or shape cues for focus, lock, selection, approval, rejection, and errors; color is supporting evidence.
- **Do** use the generated paper grain, tape, and locked-reference assets with their provenance sidecars intact.
- **Do** keep the three synthetic references visibly locked and identify their source class in both canvas and outline.

### Don't:

- **Don't** turn Iterum into an infinite whiteboard with a chatbot beside it, a bento dashboard, or a generic SaaS card grid.
- **Don't** use glossy gradients, glass effects, pill-heavy softness, AI sci-fi motifs, fake metrics, or ornamental “creative” clutter.
- **Don't** use tape, texture, rotation, or handwritten marks as scrapbook decoration; every material cue must explain attachment, alignment, or review.
- **Don't** allow agent-found material to bypass Review unless the designer has granted direct placement, and then only into Agent Additions.
- **Don't** imply that uncertain rights are cleared or omit source-page evidence from a proposal.
- **Don't** animate wax-down under reduced-motion preferences or hide a state change when its motion is removed.
- **Don't** promise full phone canvas editing; keep the phone honest, review-first, and receipt-complete.
