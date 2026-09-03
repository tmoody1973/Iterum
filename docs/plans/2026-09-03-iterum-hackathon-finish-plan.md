# Iterum Hackathon Finish Plan

## Outcome

Make Iterum demonstrably useful to a graphic designer: the agent can create and explain a campaign direction, every consequential change remains reviewable, the canvas feels like a design surface, and judges can see what happened without reading code.

## Fourteen-hour priority order

### P0 — Demo truth and legibility (hours 0–3)

- Add **Working** and **Presentation** board views.
- Presentation view removes group boxes, hierarchy badges, confidence decoration, production labels, and selection chrome.
- Keep selected annotations only when useful to the direction.
- Replace remaining Static Bloom-specific copy inside reusable campaign and type nodes with campaign data.
- Add a single contextual inspector beside the canvas; selection from canvas or Layers resolves to the same object.
- Keep Brief and Review collapsible so the canvas remains dominant.

Success: PIVOT / 01 can be shown to a judge as a clean direction, then switched to Working view to reveal provenance and structure.

### P0 — Replayable WebMCP run ledger (hours 3–5)

- Add an append-only run record: tool, intent, sanitized input summary, result summary, board version before/after, timestamp, and approval state.
- Record read-only calls, proposals, designer decisions, errors, and undo operations.
- Expose `get_campaign_run_ledger` and `replay_campaign_run` as read-only WebMCP tools.
- Render the ledger as Activity, with filters for Agent, Designer, Read, Proposal, Decision, and Error.
- Never store secrets, raw binary data, or third-party response bodies.

Success: the PIVOT campaign can prove which tools ran and which decisions remained human-controlled.

### P0 — Real campaign foundation (hours 5–8)

- Add `create_campaign` and `create_board` contracts with strict validation and idempotency.
- Add local project persistence for the demo: project list, autosave status, recovery after reload, version snapshot, and restore.
- Add `save_project`, `open_project`, `list_projects`, `create_version`, and `restore_version`.
- Treat uploads as immutable asset records with filename, source, rights, dimensions, and checksum.

Success: a blank campaign survives refresh and can be restored to a prior approved version.

### P1 — Professional canvas mechanics (hours 8–11)

- Multi-select and marquee selection.
- Contextual move, resize, rotate, crop/focal point, lock, layer order, duplicate, and delete.
- Group/ungroup, drag group, align, distribute, snap guides, and move to territory.
- Add corresponding WebMCP tools: `select_board_items`, `move_board_items`, `resize_board_items`, `rotate_board_items`, `align_board_items`, `distribute_board_items`, `group_board_items`, `ungroup_board_items`, `set_item_layer`, `duplicate_board_items`, `delete_board_items`, `create_territory_frame`, and `move_items_to_territory`.
- Broad or interpretive changes must become reviewable batches; direct deterministic edits follow lock and version rules.

Success: a designer can refine the agent’s composition without fighting the canvas.

### P1 — Exportable campaign proof (hours 11–14)

- Make application headline, image crop, palette, grid, logo position, and format editable.
- Add `create_campaign_application`, `adapt_application_format`, `apply_approved_direction`, and `check_application_consistency`.
- Add Presentation export, source manifest, and print stylesheet; PDF/share-link delivery may remain local-demo scoped if backend storage is unfinished.
- Finish with a recorded blank-campaign E2E run and a concise judge walkthrough.

Success: an approved direction produces at least one editable application and a client-readable output.

## Complete post-hackathon tool backlog

### Image direction

`set_image_crop`, `set_focal_point`, `apply_image_treatment`, `create_image_treatment_variants`, `compare_image_treatments`, `generate_reference_image`, `generate_campaign_image`, `replace_application_image`.

### Typography

`create_type_specimen`, `set_type_scale`, `set_type_tracking`, `set_type_leading`, `assign_type_role`, `compare_type_pairings`, `check_font_license`, `apply_type_direction_to_application`.

### Color

`extract_palette_from_selection`, `assign_palette_roles`, `check_palette_contrast`, `apply_palette_to_territory`, `compare_palette_variants`, `generate_tint_scale`.

### Creative direction

`compare_creative_territories`, `score_territory_against_brief`, `identify_redundant_references`, `identify_direction_gaps`, `summarize_visual_principles`, `promote_territory_to_direction`, `create_direction_snapshot`.

### Delivery

`prepare_client_presentation`, `export_board_pdf`, `export_source_manifest`, `create_share_link`.

## Interface rules

- One primary toolbar, one contextual inspector, one collapsible Brief, one Review queue, one canvas.
- Canvas, Layers, Review, Library, and History share one selection identity; selecting anywhere focuses the same object.
- Working view explains system state. Presentation view shows creative work.
- Decorative controls are removed until they perform a real operation.
- Agent proposals never impersonate designer approval.
- Every mutation is versioned, attributable, and recoverable.

## Verification

- Unit tests for display state, strict contracts, idempotency, ledger sanitization, persistence, and restore.
- Component tests for keyboard selection, inspector actions, and mode switching.
- Playwright at 1440, 1024, 768, and phone width.
- A blank-campaign E2E scenario that records tools, approvals, versions, reload recovery, presentation view, and export.
- Production build and clean browser console/network assertions.

## Explicit non-goals for the deadline

- Real-time multiplayer/Yjs.
- Multiple image-provider additions.
- Production authentication and billing.
- Cloud share links if local persistence and export are not already stable.
- Generative application variants without editable output and provenance.
