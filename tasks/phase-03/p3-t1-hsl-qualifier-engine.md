# P3-T1 HSL Qualifier Engine

## Status

Not started

## Phase

[Phase 03 - Qualifier and Power Windows](../../roadmap/phase-03-qualifier-and-power-windows.md)

## Outcome

The color engine can evaluate an HSL-style qualifier mask for each node.

## Scope

- Add qualifier defaults and validation.
- Convert RGB to hue, saturation, and luminance values.
- Evaluate hue center, width, and softness.
- Evaluate saturation and luminance ranges with softness.
- Support invert.

## Implementation Notes

- Use circular hue distance so red ranges can cross 0.
- Use Rec.709 luma for luminance.
- Qualifier should evaluate against node input before correction.

## Acceptance Criteria

- Disabled qualifier returns mask value 1.
- Hue wrapping works for red selections.
- Softness creates grayscale matte values.
- Invert flips the matte result.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

