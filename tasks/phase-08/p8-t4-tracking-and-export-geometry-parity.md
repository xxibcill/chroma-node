# [P8-T4] Tracking And Export Geometry Parity

## Status

Not started

## Phase

[Phase 08 - Media Geometry and Vertical Video](../../roadmap/phase-08-media-geometry-and-vertical-video.md)

## Outcome

Keep tracking and export behavior aligned with the new display-space geometry model.

## Scope

- Make tracking inputs and bounds orientation-aware.
- Ensure export snapshotting uses the same display geometry assumptions as preview.
- Prevent portrait support from introducing preview and export mismatches.

## Implementation Notes

- Tracking templates and normalized window coordinates should operate against one agreed display space.
- This task should not yet add new export sizes; it should only preserve parity for source-geometry export.

## Acceptance Criteria

- Tracking on portrait or rotated media produces stable keyframes in the expected screen direction.
- Exported output matches preview orientation for supported media.
- No geometry-specific regressions appear in tracked-window exports.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
