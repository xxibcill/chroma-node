# [P8-T2] Import And Relink Geometry Validation

## Status

Not started

## Phase

[Phase 08 - Media Geometry and Vertical Video](../../roadmap/phase-08-media-geometry-and-vertical-video.md)

## Outcome

Replace fixed 1080p validation with geometry-aware import and relink rules.

## Scope

- Update media probe validation to allow portrait, square, and larger rasters.
- Align relink validation with the new geometry model.
- Preserve clear user-facing errors for truly unsupported media.

## Implementation Notes

- Validation should distinguish unsupported format or codec from size and performance guidance.
- If practical limits remain, express them as capability tiers or warnings rather than as a landscape-only hard stop.

## Acceptance Criteria

- Portrait and square media no longer fail simply because the display size is not 1920 x 1080 or smaller.
- Relink checks use the same compatibility rules as import.
- Unsupported media errors remain specific and actionable.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
