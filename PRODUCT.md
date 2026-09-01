# CampaignCanvas

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Next.js and TypeScript
- React Konva for the interactive canvas
- Zustand for transient interface and canvas state only
- Postgres with Drizzle for canonical campaign, board, proposal, asset, and action-receipt records
- Cloudflare R2 for uploaded images, URL captures, crops, thumbnails, and exports
- Fontsource API as the primary freely embeddable font catalog
- Google Fonts Developer API as secondary font discovery and ranking metadata
- Unsplash API as the built-in source for licensable photographic references
- Provider-agnostic broad-web discovery through browser-agent research and sourced URL submission
- Yjs with Liveblocks, or Liveblocks Storage, may be evaluated later for collaboration; the MVP is single-user

## Users

The initial user is one professional graphic designer developing a campaign direction. They arrive with a brief and a small number of references, then research, judge, organize, and articulate a visual direction before producing final design work elsewhere.

Collaboration is explicitly deferred. A future Designer role may allow every designer to approve agent-found items, but the first version has one designer and requires no voting, invitations, presence, or multiplayer permissions.

## Product Purpose

CampaignCanvas is an agent-readable visual-direction workspace. It helps a graphic designer collect references, review agent research, organize approved material into campaign territories, analyze color and typography, identify gaps, and export a coherent creative-direction brief.

Success means a designer can move from a campaign brief and a few taste-setting references to a sourced, reviewable, editable direction without reconciling disconnected chat suggestions, browser tabs, screenshots, and font searches by hand.

## Positioning

CampaignCanvas is not a generic moodboard with a chatbot beside it. The canvas itself exposes typed WebMCP capabilities. A browser agent reads the same brief, items, approval states, locks, territories, sources, and versions that the designer sees, then performs reversible actions on that durable workspace.

The product's defining interaction is the visible transition from agent proposal, to designer approval, to an organized campaign territory with a human-readable action receipt.

## Operating Context

- The designer works primarily on desktop in a three-zone interface: campaign brief, creative canvas, and review/activity panel.
- The campaign begins with a brief and three locked references.
- Agent-found items enter the Review Tray by default.
- The designer may enable direct placement for a board or one request; direct additions initially land in a designated Agent Additions region.
- Human-added and agent-proposed references retain sources, timestamps, decision history, and provenance.
- The canvas contains visual references, URL captures, sketches, notes, type specimens, palette cards, annotations, and visual-territory frames.
- The designer can lock references so the agent cannot remove or materially change them without explicit approval.

## Capabilities and Constraints

### Core WebMCP capabilities

- Read the campaign context, board state, board version, review tray, and placement policy.
- Search photographic references through Unsplash and submit sourced URLs discovered through broader browser research.
- Add uploaded images, sketches, links, materials, products, screenshots, and notes.
- Capture a public URL automatically, then let the designer crop it in the app. Preserve the original capture and store crop coordinates separately.
- Propose references to the Review Tray with source, attribution, rationale, category, and proposed territory.
- Approve or reject proposals, create visual territories, place approved items, lock items, and undo agent actions.
- Extract, compare, edit, and place color palettes. Deterministic image analysis supplies actual color values; agent interpretation assigns creative roles.
- Search freely embeddable typefaces, create editable specimens, compare directions, and propose pairings.
- Optionally include commercial typefaces as clearly labeled reference-only results. Never embed or download an unlicensed commercial font. A designer-supplied licensed font may become editable later.
- Analyze visual directions, identify gaps, and export a campaign-direction brief.

### Data and trust constraints

- Postgres is canonical. Zustand never becomes the durable board store.
- Human and WebMCP mutations use the same command layer, version checks, validation, and action receipts.
- Every write is idempotent and includes the board version it expects.
- Search results and provider payloads are untrusted and normalized on the server.
- Unsplash images use the returned hotlinked URLs and required attribution. Selection-like actions trigger the provider's download-tracking endpoint.
- Google Custom Search JSON API is not a dependency because it is closed to new customers and scheduled for discontinuation.
- Broad-web results are discovery references: preserve the hosting page, creator and rights information when available, and do not imply reuse rights.
- URL capture blocks private-network targets and reports authenticated, paywalled, blocked, or failed captures clearly.
- Provider failures degrade to cached or partial results without damaging board state.

## Brand Commitments

- Working product name: **CampaignCanvas**. The final name remains open.
- Primary user term: **Designer**.
- Primary artifact terms: **Campaign**, **Board**, **Review Tray**, **Reference**, **Visual Territory**, and **Action Receipt**.
- Voice should be precise, visually literate, respectful of professional judgment, and free of AI hype.
- The product must preserve designer authorship: the agent researches, proposes, explains, arranges with permission, and leaves reversible receipts.

## Evidence on Hand

The featured demonstration is a wholly synthetic fragrance campaign:

- Product: **Static Bloom**
- Campaign line: **The air remembers.**
- Concept: a gender-neutral fragrance inspired by the moment after a summer storm, combining ozone, crushed iris, mineral rain, warm concrete, and skin.
- Audience: design-aware urban adults approximately 24–38.
- Initial deliverables: street poster, 4:5 social campaign, landing-page hero, and digital lookbook cover.
- Anti-directions: black-and-gold luxury conventions, pedestal bottle imagery, literal rain, soft-focus flowers, and generic vaporwave gradients.
- Three locked reference roles: wet concrete reflecting distorted sodium light; a translucent crushed flower suspended in clear resin; an asymmetrical typographic poster with extreme scale contrast and partially obscured text.

The synthetic campaign is demonstration material, not a real customer engagement. No customers, testimonials, usage metrics, awards, pricing, or performance claims exist and must not be invented.

## Product Principles

1. **Human taste remains authoritative.** Agent-found references are proposals unless the designer explicitly grants placement permission.
2. **The canvas is the shared state.** Agent work resolves into the same durable visual workspace the designer edits.
3. **Show the source and the change.** References retain provenance, and every mutation leaves a readable, undoable receipt.
4. **Interpret without pretending certainty.** Separate verified font, license, and source metadata from visual classification or likely matches.
5. **Direction before production.** The MVP develops and exports a campaign direction; it does not generate finished advertisements.

## Accessibility & Inclusion

- Brief, review, activity, settings, dialogs, notes, and source details use semantic DOM rather than canvas-only rendering.
- Every important canvas action needs a keyboard-accessible alternative outside the canvas.
- Focus, selection, lock, proposal, processing, error, and approval states cannot rely on color alone.
- Reduced-motion preferences must preserve state transitions without animated movement.
- The formal accessibility conformance target remains an open implementation decision.
