# [P15-T6] CIE Gamut And 3D Color Visualization

## Status

Not started

## Phase

[Phase 15 - Professional Scopes and Monitoring Suite](../../roadmap/phase-15-professional-scopes-and-monitoring-suite.md)

## Outcome

Add CIE and gamut visualization tools for understanding whether colors fit the selected working, display, or delivery space.

## Scope

- Add CIE 1931 xy and CIE 1976 u'v' chromaticity scopes.
- Add Rec.709, P3, Rec.2020, and selected output gamut boundaries.
- Add out-of-gamut overlays, gamut compression previews, and clipping diagnostics.
- Add 3D color-volume visualization for advanced inspection when performance allows.

## Implementation Notes

- Use established color conversion math and reference tests; do not approximate chromaticity for display only.
- Keep 3D visualization optional and nonblocking because it is expensive and advanced.
- Make gamut warnings line up with the same gamut mapping used by export.
- Avoid turning CIE scopes into decorative charts; they should answer whether colors fit a target.

## Acceptance Criteria

- Users can view chromaticity against selected gamut boundaries.
- Out-of-gamut pixels are measurable and can be highlighted.
- 3D color-volume view is gated behind capability/performance checks if implemented.
- Tests cover RGB-to-XYZ-to-CIE conversion and gamut-boundary plotting.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Blockers

- Accurate profile primaries and white points must exist in the profile registry.
