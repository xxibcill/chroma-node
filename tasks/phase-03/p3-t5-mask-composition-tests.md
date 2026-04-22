# P3-T5 Mask Composition Tests

## Status

Not started

## Phase

[Phase 03 - Qualifier and Power Windows](../../roadmap/phase-03-qualifier-and-power-windows.md)

## Outcome

Automated tests verify qualifier masks, window masks, mask composition, and correction blending.

## Scope

- Add CPU mask tests for qualifier edge cases.
- Add CPU mask tests for windows.
- Add shader parity tests for mask composition.
- Add golden-frame tests for masked corrections.

## Implementation Notes

- Use synthetic frames with known colors and positions.
- Include hue wraparound tests.
- Include both hard and soft masks.

## Acceptance Criteria

- Qualifier mask tests pass.
- Window mask tests pass.
- Combined mask equals `qualifierMask * windowUnionMask`.
- Masked node output matches CPU reference within tolerance.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

