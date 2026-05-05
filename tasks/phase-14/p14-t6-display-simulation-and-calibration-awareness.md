# [P14-T6] Display Simulation And Calibration Awareness

## Status

Implemented - Completed

Not started

## Phase

[Phase 14 - Ultimate Color Management Expansion](../../roadmap/phase-14-ultimate-color-management-expansion.md)

## Outcome

Add display simulation and calibration-aware warnings so users understand what their current screen can and cannot show.

## Scope

- Add viewing presets for Rec.709 gamma 2.4, sRGB, Display P3, Rec.2020 PQ, and Rec.2020 HLG.
- Add soft-proof overlays for gamut clipping, range clipping, and output-limit warnings.
- Track display simulation separately from export target.
- Add hooks for calibration LUTs or display profile metadata if available.

## Implementation Notes

- Do not imply reference-monitor accuracy unless the app can verify the display path.
- Keep display simulation reversible and outside the creative grade.
- Add warnings for mismatched viewer simulation and export target.
- Keep beginner defaults quiet: Rec.709 projects should not be flooded with advanced warnings.

## Acceptance Criteria

- Users can select a display simulation independent of output settings.
- The app warns when the selected output cannot be faithfully previewed.
- Calibration/viewing LUTs are separated from creative and technical transform LUTs.
- Tests cover display-simulation state, serialization, and warning generation.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Calibration profile and LUT support need a clear product decision.
