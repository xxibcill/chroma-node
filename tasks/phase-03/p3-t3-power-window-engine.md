# P3-T3 Power Window Engine

## Status

Not started

## Phase

[Phase 03 - Qualifier and Power Windows](../../roadmap/phase-03-qualifier-and-power-windows.md)

## Outcome

The color engine can evaluate ellipse and rectangle power-window masks per node.

## Scope

- Add ellipse and rectangle defaults.
- Evaluate normalized window coordinates.
- Support width, height, center, rotation, softness, and invert.
- Union enabled windows with max mask.
- Multiply window union by qualifier mask.

## Implementation Notes

- Coordinates use normalized viewer space from 0 to 1.
- Rotation is stored in degrees but shader may use radians.
- If no windows are enabled, window mask is 1.

## Acceptance Criteria

- Ellipse mask affects only the ellipse area.
- Rectangle mask supports rotation.
- Softness feathers edges.
- Both windows enabled combine as a union.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

