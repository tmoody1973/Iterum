# Iterum professional campaign workflow

## Product promise

Iterum helps a graphic designer move from a client-approved brief to distinct, sourced, reviewable creative directions. The agent expands and structures the work; the designer owns approvals and canonical board changes.

## Implemented slice

1. The campaign brief is structured into objective, audience, proposition, tone, mandatory assets, anti-directions, and schedule.
2. A designer can unlock, edit, save, and lock that brief. Agents cannot change a locked brief or lock it themselves.
3. An agent can propose one to three creative routes after the brief is locked.
4. Each route records a thesis, territory, palette, typography approach, image treatment, composition principles, and bounded canvas frame.
5. Pending routes appear both on the board and in the Review Tray. Only the designer can approve or reject them.
6. Decisions are versioned, receipted, and undoable within the current session.

## WebMCP contracts added

- `update_campaign_brief`
- `request_campaign_brief_lock`
- `propose_creative_routes`
- `request_creative_route_decision`

`get_campaign_context` now returns the structured brief, creative routes, and an explicit product-boundary note.

## Deliberately deferred

- Multiple persistent campaigns and boards
- Durable autosave, recovery, and version history
- Route-specific application generation
- Presentation mode, PDF export, and share links

Those features require a persistence and artifact model. The current interface labels itself as a single-session direction workspace so it does not imply production guarantees that do not exist yet.
