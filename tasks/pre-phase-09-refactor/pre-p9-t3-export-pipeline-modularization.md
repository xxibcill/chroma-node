# [PRE-P9-T3] Export Pipeline Modularization

## Status

Not started

## Phase

[Phase 09 - Flexible Export Geometry](../../roadmap/phase-09-flexible-export-geometry.md)

## Outcome

Split export planning, frame transformation, FFmpeg orchestration, and output verification into focused modules so Phase 09 can add geometry transforms without further bloating the export entrypoint.

## Scope

- Extract export request validation and snapshot planning out of `src/main/exportProject.ts`.
- Separate frame rendering and geometry transform planning from FFmpeg process management.
- Isolate output probing and verification so planned raster and actual raster are compared in one place.

## Implementation Notes

- Keep `src/main/exportProject.ts` as a thin coordinator after the split rather than a second large implementation surface.
- Export planning should consume shared geometry helpers instead of recomputing width and height directly from `media.displayWidth` and `media.displayHeight`.

## Acceptance Criteria

- Export planning and export execution are implemented in separate modules.
- The export path can report planned output geometry before encode work begins.
- `src/main/exportProject.ts` no longer owns geometry policy, FFmpeg wiring, and validation details in one file.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
