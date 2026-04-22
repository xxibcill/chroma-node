# P2-T3 Node Graph UI

## Status

Not started

## Phase

[Phase 02 - Color Engine and Serial Nodes](../../roadmap/phase-02-color-engine-and-serial-nodes.md)

## Outcome

The user can manage up to 3 serial nodes through the UI.

## Scope

- Display node strip.
- Add node until max 3.
- Delete node when more than 1 exists.
- Select active node.
- Rename, reset, enable, and disable nodes.

## Implementation Notes

- Node order is always serial and left-to-right.
- Deleting the selected node should select the nearest remaining node.
- Add button should disable at 3 nodes.

## Acceptance Criteria

- Node graph never has fewer than 1 or more than 3 nodes.
- Selected node drives the inspector controls.
- Disabled nodes visibly indicate bypass state.
- Reset restores neutral values for that node.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

