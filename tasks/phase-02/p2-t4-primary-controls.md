# P2-T4 Primary Controls

## Status

Not started

## Phase

[Phase 02 - Color Engine and Serial Nodes](../../roadmap/phase-02-color-engine-and-serial-nodes.md)

## Outcome

The user can adjust lift, gamma, gain, offset, contrast, pivot, saturation, temperature, and tint for the active node.

## Scope

- Add RGB controls for lift, gamma, gain, and offset.
- Add scalar controls for contrast, pivot, saturation, temperature, and tint.
- Add per-control reset.
- Update viewer on parameter changes.
- Clamp values to MVP ranges.

## Implementation Notes

- Numeric input and slider/wheel state must update the same model values.
- Temperature and tint can use a simple RGB scale approximation for MVP.
- Debounce expensive downstream work but keep viewer changes responsive.

## Acceptance Criteria

- Each primary control changes the active node only.
- Neutral values produce unchanged output.
- Out-of-range input is clamped.
- Paused-frame parameter latency is under the target.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

