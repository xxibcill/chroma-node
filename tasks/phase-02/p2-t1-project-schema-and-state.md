# P2-T1 Project Schema And State

## Status

Not started

## Phase

[Phase 02 - Color Engine and Serial Nodes](../../roadmap/phase-02-color-engine-and-serial-nodes.md)

## Outcome

The app has validated project, media, playback, node, correction, qualifier, window, tracking, and export state models.

## Scope

- Define TypeScript interfaces for project state.
- Add schema validation.
- Add neutral defaults.
- Add parameter clamping.
- Add project migration hook for future schema versions.

## Implementation Notes

- Use schema version `1.0.0`.
- Store video as a media path reference only.
- Keep values JSON-serializable.

## Acceptance Criteria

- A new project initializes with one neutral node.
- Invalid numeric values are clamped or rejected.
- Node arrays cannot exceed 3 nodes.
- Schema validation errors are structured.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

