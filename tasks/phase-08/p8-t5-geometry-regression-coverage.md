# [P8-T5] Geometry Regression Coverage

## Status

Not started

## Phase

[Phase 08 - Media Geometry and Vertical Video](../../roadmap/phase-08-media-geometry-and-vertical-video.md)

## Outcome

Add test coverage for portrait, square, rotated, and larger-raster media flows.

## Scope

- Extend unit tests around probing, relink, and geometry helpers.
- Add export and renderer-focused regression cases where practical.
- Document the minimum sample matrix needed to validate geometry support.

## Implementation Notes

- Prioritize lightweight deterministic fixtures before adding heavy media assets.
- Include at least one case where coded and display raster differ because of rotation metadata.

## Acceptance Criteria

- Probe validation covers portrait, square, rotated, and larger-raster inputs.
- Export and tracking parity have at least one geometry-focused regression case each.
- The expected validation sample matrix is documented for future verification runs.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
