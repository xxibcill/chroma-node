# [P12-T4] Visual Node Graph

## Status

Done (node-strip with Copy/Paste/Duplicate/Bypass/Delete actions wired - see commit e57b57b)

## Phase

[Phase 12 - Resolve-Style Color Page Upgrade](../../roadmap/phase-12-resolve-style-color-page-upgrade.md)

## Outcome

Upgrade the current serial node list into a visual node graph that is easier to scan, reorder, bypass, copy, and compare.

## Scope

- Add node tiles with labels, status, bypass state, and optional thumbnails.
- Support drag reorder for the existing serial node chain.
- Add node copy, paste, duplicate, rename, delete, bypass, and solo-style inspection commands.
- Add node color/label metadata for organization.
- Keep parallel and layer nodes out of scope unless serial-node UX is complete and stable.

## Implementation Notes

- Preserve the existing serial evaluation order in the shared project model.
- Add graph UI metadata separately from grading math where possible.
- Avoid implementing arbitrary node compositing in this task; it belongs in a later phase.
- Keep node operations undoable through the existing undo/redo state.

## Acceptance Criteria

- Users can understand node order visually without reading a dense list.
- Dragging nodes changes serial evaluation order and updates preview/export results.
- Copying and duplicating nodes preserves all node settings, including qualifiers, windows, curves, and future LUT state.
- Node operations are covered by focused renderer tests.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
