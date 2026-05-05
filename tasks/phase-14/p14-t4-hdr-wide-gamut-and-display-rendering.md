# [P14-T4] HDR Wide Gamut And Display Rendering

## Status

Implemented - Completed

Not started

## Phase

[Phase 14 - Ultimate Color Management Expansion](../../roadmap/phase-14-ultimate-color-management-expansion.md)

## Outcome

Support HDR and wide-gamut workflows through explicit display rendering, tone mapping, gamut mapping, and nit-aware monitoring.

## Scope

- Add PQ, HLG, Rec.2020, Display P3, and Rec.709 output/viewing paths.
- Track peak luminance, reference white, diffuse white, black level, and mastering-display assumptions.
- Add tone-map operators for HDR-to-SDR and display-limited preview.
- Add gamut compression and clipping diagnostics.
- Prepare preview behavior for displays that cannot actually show the selected HDR target.

## Implementation Notes

- Distinguish scene-referred working values from display-referred preview/output values.
- Keep SDR Rec.709 the default output until HDR delivery is validated end to end.
- Add warning states when the user's monitor cannot represent the selected target.
- Coordinate with scope scale controls so HDR values are measurable in nits where appropriate.

## Acceptance Criteria

- HDR source to SDR output uses explicit tone and gamut mapping.
- HDR delivery settings can describe target transfer, gamut, peak, and metadata.
- The viewer can preview display-rendered output even on non-HDR monitors with clear limitations.
- Tests cover boundary values above SDR white, gamut-edge colors, and Rec.709 identity.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- HDR export paths and metadata validation must be stable before HDR delivery is marked complete.
