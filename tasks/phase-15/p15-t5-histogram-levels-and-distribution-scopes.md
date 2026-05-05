# [P15-T5] Histogram Levels And Distribution Scopes

## Status

Not started

## Phase

[Phase 15 - Professional Scopes and Monitoring Suite](../../roadmap/phase-15-professional-scopes-and-monitoring-suite.md)

## Outcome

Add histogram and distribution scopes that help users inspect tonal range, channel balance, saturation, and zone placement.

## Scope

- Add RGB histogram, luma histogram, log histogram, cumulative histogram, saturation histogram, hue histogram, and zone-system distribution.
- Add percentile markers, min/max readouts, median/mean indicators, and clipping counts.
- Add region-select and compare modes.
- Add scale options for normalized, code-value, IRE, and HDR where relevant.

## Implementation Notes

- Keep distribution scopes compact and readable in a shared scope grid.
- Use statistical readouts sparingly and only when they help diagnose exposure or balance.
- Make histogram bin counts deterministic across preview and test environments.
- Reuse data for false-color and clipping monitors where possible.

## Acceptance Criteria

- Users can switch between tonal, channel, hue, and saturation histograms.
- Distribution readouts update with selected measurement space and region.
- Clipping and percentile markers reflect the active output intent.
- Tests cover binning, cumulative values, and readout calculations.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Blockers

- None
