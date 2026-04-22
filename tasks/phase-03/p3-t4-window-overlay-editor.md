# P3-T4 Window Overlay Editor

## Status

Done

## Phase

[Phase 03 - Qualifier and Power Windows](../../roadmap/phase-03-qualifier-and-power-windows.md)

## Outcome

The user can visually move, resize, and rotate active-node power windows in the viewer.

## Scope

- Draw ellipse and rectangle overlays.
- Add center drag handles.
- Add resize handles.
- Add rotation handle.
- Map viewer pointer coordinates to normalized source coordinates.

## Implementation Notes

- Overlay must respect viewer aspect fit.
- Keep minimum window size to prevent unusable handles.
- Overlays should never be included in export.

## Acceptance Criteria

- Dragging a center handle updates centerX and centerY.
- Resize handles update width and height.
- Rotation handle updates rotationDegrees.
- Pointer mapping remains correct after viewer resize.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Blockers

- None
