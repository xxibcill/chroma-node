# P1-T3 Frame Stepping And Scrubbing

## Status

Done

## Phase

[Phase 01 - Import, Viewer, Playback](../../roadmap/phase-01-import-viewer-playback.md)

## Outcome

The user can scrub through the clip and step frame-by-frame with clamped first/last frame behavior.

## Scope

- Add scrub control.
- Add step forward and step backward.
- Add jump to first frame and last frame.
- Clamp frame index at clip boundaries.
- Update viewer after scrub and step actions.

## Implementation Notes

- Use exact frame path for frame stepping where possible.
- Scrubbing can use approximate preview updates while dragging.
- Settle to a deterministic frame after scrub ends.

## Acceptance Criteria

- Step forward advances one frame.
- Step backward moves one frame.
- Boundary actions clamp instead of throwing.
- Scrub updates viewer within the performance target.

## Progress

- [x] Implemented
- [x] Verified

## Blockers

- None
