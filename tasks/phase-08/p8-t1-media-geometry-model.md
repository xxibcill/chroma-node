# [P8-T1] Media Geometry Model

## Status

Not started

## Phase

[Phase 08 - Media Geometry and Vertical Video](../../roadmap/phase-08-media-geometry-and-vertical-video.md)

## Outcome

Add a shared geometry model that distinguishes coded raster, display raster, and orientation.

## Scope

- Extend shared media metadata with coded and display dimensions.
- Normalize rotation and orientation into reusable helpers.
- Define migration behavior for older project files that only store width and height.

## Implementation Notes

- Centralize geometry math so the renderer, tracking, scopes, and export do not each reinterpret rotation separately.
- Keep legacy project loading safe by defaulting absent geometry fields from existing media metadata.

## Acceptance Criteria

- Shared media metadata can express both stored raster and displayed raster.
- Rotated media no longer requires ad hoc width and height swapping in downstream features.
- Older project files still load with sensible geometry defaults.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
