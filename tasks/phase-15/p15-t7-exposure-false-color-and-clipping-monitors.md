# [P15-T7] Exposure False Color And Clipping Monitors

## Status

Not started

## Phase

[Phase 15 - Professional Scopes and Monitoring Suite](../../roadmap/phase-15-professional-scopes-and-monitoring-suite.md)

## Outcome

Add practical viewer overlays and monitors for exposure, clipping, gamut, legal range, and HDR brightness.

## Scope

- Add false color for SDR IRE and HDR nit ranges.
- Add zebra overlays, highlight clipping, shadow clipping, gamut warning, legal-range warning, and skin/exposure target overlays.
- Add selectable overlay source: original, graded, output, or selected region.
- Add overlay opacity and quick toggle controls.

## Implementation Notes

- False color and zebras should be viewer overlays, while their numeric summaries should be available in scopes.
- Make overlay thresholds tied to selected output/delivery profile by default.
- Keep overlays out of exported media unless explicitly requested in a diagnostic export mode.
- Ensure overlays are accessible and not dependent on indistinguishable colors alone.

## Acceptance Criteria

- Users can toggle false color, zebras, clipping, and gamut warnings from the viewer or scope panel.
- Overlay thresholds can be adjusted and reset.
- Overlay behavior matches scope measurement and export intent.
- Tests cover threshold classification and overlay state serialization.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Viewer overlay architecture must support non-destructive diagnostic overlays.
