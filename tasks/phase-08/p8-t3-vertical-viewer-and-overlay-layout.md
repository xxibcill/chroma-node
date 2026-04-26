# [P8-T3] Vertical Viewer And Overlay Layout

## Status

Not started

## Phase

[Phase 08 - Media Geometry and Vertical Video](../../roadmap/phase-08-media-geometry-and-vertical-video.md)

## Outcome

Render portrait and rotated clips correctly in the viewer, scopes, and overlay system.

## Scope

- Update viewer containment math to use display-space geometry.
- Keep power-window overlays aligned with portrait and rotated media.
- Ensure scopes sample the same displayed frame geometry the user sees.

## Implementation Notes

- Metadata panels should communicate coded raster, display raster, and rotation distinctly.
- Avoid renderer-only fixes that leave overlay hit-testing or scope sampling in a mismatched coordinate system.

## Acceptance Criteria

- Portrait clips display with correct aspect ratio in the viewer.
- Overlay handles remain aligned while moving, resizing, and rotating windows on portrait media.
- Scope samples match the visible graded frame orientation.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
