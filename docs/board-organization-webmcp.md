# Board Organization WebMCP

Iterum’s organization capability turns a route or bounded reference set into a reviewable creative hierarchy. It does not let an agent silently rearrange the live board.

## Designer flow

1. Choose a route, territory, selection, or the whole board explicitly.
2. Group by approved tags or Iterum item type.
3. Generate a deterministic `cluster-grid` preview.
4. Inspect proposed groups, hero/primary/supporting roles, confidence, protected references, and unresolved items.
5. Apply or reject the exact stored proposal in Review.
6. Undo an applied organization through Iterum History.

## WebMCP tools

### `get_board_structure`

Reads creative routes, approved groups and hierarchy, ungrouped items, unresolved proposal items, and organization proposals.

### `propose_board_organization`

Creates an immutable proposal from an explicit scope and expected board version. It supports `tag` and `type` grouping, `cluster-grid`, one to six groups, and `visual-weight` or `board-order` ranking. It never changes board items.

### `preview_board_organization`

Displays the exact pending proposal as a ghost arrangement, focuses its affected board region, and opens Review. It fails if the canonical board changed after proposal creation.

### `explain_board_group`

Explains one pending or approved group, including its rationale, hero, hierarchy assignments, confidence, and unresolved weak matches.

There is intentionally no `approve_board_organization` tool. Applying or rejecting the proposal is a designer action in Iterum’s Review Tray. The existing `undo_action` contract remains the single compensating-action mechanism.

## Canonical structure

```text
Campaign
└── Creative Route
    └── Board Group
        └── Board Item (hero | primary | supporting)
```

Collapse state and preview visibility remain local Zustand presentation state. Approved group membership and hierarchy are canonical board data.
