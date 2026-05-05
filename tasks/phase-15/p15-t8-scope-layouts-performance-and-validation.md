# [P15-T8] Scope Layouts Performance And Validation

## Status

Not started

## Phase

[Phase 15 - Professional Scopes and Monitoring Suite](../../roadmap/phase-15-professional-scopes-and-monitoring-suite.md)

## Outcome

Make the expanded scope suite usable through presets, focused layouts, capture/freeze tools, performance controls, and validation coverage.

## Scope

- Add scope layout presets: compact two-up, four-up, full-height, focused single scope, floating drawer, and compare layout.
- Add freeze, snapshot, scope capture, region selection, and reference overlay workflows.
- Add quality/performance controls for sampling resolution, playback throttling, and pause-quality updates.
- Add visual regression and unit coverage for every scope family.

## Implementation Notes

- Scope layouts should preserve viewer dominance by default.
- Add stable dimensions so switching scopes does not move the main grading controls.
- Freeze/capture should store measurement metadata so users know what pipeline stage was measured.
- Use performance telemetry to show when scopes are reduced during playback.

## Acceptance Criteria

- Users can save or switch scope layouts without disrupting the viewer.
- Scope capture/freeze records frame, measurement space, profile, and scale.
- Playback remains responsive with common two-up and four-up scope layouts.
- Scope tests cover calculations, rendering guides, layout stability, and performance policy.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- UI layout work must provide enough panel infrastructure for saved scope arrangements.
