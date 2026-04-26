# Phase 08 - Media Geometry and Vertical Video

## Status

Not started

## Functional Feature Outcome

The user can import portrait, square, rotated, and larger-raster clips and see them previewed, tracked, scoped, and exported with correct display geometry.

## Why This Phase Exists

The current app still treats `width` and `height` as if every clip were a simple landscape raster. That breaks down once portrait media, rotation metadata, and larger sources enter the system. This phase establishes one shared geometry model so preview, scopes, tracking, relink, and export all agree on what the user is looking at.

## Scope

- Add a shared media-geometry model that separates coded raster from display raster.
- Support portrait and rotated media import without special-case UI behavior.
- Make viewer layout, overlays, scopes, and tracking orientation-aware.
- Remove the product-level assumption that supported media must fit inside 1920 x 1080.
- Add regression tests for portrait, square, rotated, and larger-raster clips.

## Tasks

| Task | Summary |
| --- | --- |
| [P8-T1](../tasks/phase-08/p8-t1-media-geometry-model.md) | Add shared coded/display raster and orientation metadata. |
| [P8-T2](../tasks/phase-08/p8-t2-import-and-relink-geometry-validation.md) | Replace fixed 1080p import and relink limits with geometry-aware validation. |
| [P8-T3](../tasks/phase-08/p8-t3-vertical-viewer-and-overlay-layout.md) | Make the viewer, scopes, and overlays render portrait and rotated clips correctly. |
| [P8-T4](../tasks/phase-08/p8-t4-tracking-and-export-geometry-parity.md) | Keep tracking and export aligned with the new display-space model. |
| [P8-T5](../tasks/phase-08/p8-t5-geometry-regression-coverage.md) | Add tests and sample cases for portrait, square, rotated, and larger-raster media. |

## Dependencies

- Phase 07 is complete.
- FFprobe continues to provide rotation and stream metadata.
- The project schema can be extended or migrated safely.

## Exit Criteria

- Portrait and rotated clips import without being misframed or rejected purely due to orientation.
- Viewer overlays, scopes, and tracking use the same display geometry as export.
- Media relink validates compatibility against geometry rules instead of a hard-coded 1080p limit.
- Regression coverage exists for portrait, square, rotated, and larger-raster samples.
