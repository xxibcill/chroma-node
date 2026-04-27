# [P12-T3] Curves Palette

## Status

Done (CurvesPalette component with Master/RGB channels, point editing, enable/reset - see commit e57b57b)

## Phase

[Phase 12 - Resolve-Style Color Page Upgrade](../../roadmap/phase-12-resolve-style-color-page-upgrade.md)

## Outcome

Add a curves palette for precise tonal and hue-based grading.

## Scope

- Add custom luma, red, green, and blue curve data to the project schema.
- Add an editable curve UI with points, handles, reset, and channel toggles.
- Add hue-vs-hue, hue-vs-saturation, hue-vs-luminance, luminance-vs-saturation, and saturation-vs-saturation curves.
- Display a lightweight histogram behind custom curves when a graded frame is available.

## Implementation Notes

- Use structured curve point data and interpolation helpers rather than ad hoc string or canvas state.
- Centralize curve evaluation in the shared color engine and generate equivalent WebGL shader code.
- Define project migration defaults so older nodes load with identity curves.
- Keep interaction constraints predictable: ordered points, bounded values, and removable non-endpoint control points.

## Acceptance Criteria

- Identity curves preserve the same image as the current color engine.
- Users can add, move, remove, and reset curve points.
- Hue-vs and custom curves affect preview and export consistently.
- Unit tests cover interpolation, bounds, identity behavior, and representative curve adjustments.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
