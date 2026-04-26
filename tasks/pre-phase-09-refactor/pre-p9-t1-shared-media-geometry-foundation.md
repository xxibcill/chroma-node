# [PRE-P9-T1] Shared Media Geometry Foundation

## Status

Not started

## Phase

[Phase 09 - Flexible Export Geometry](../../roadmap/phase-09-flexible-export-geometry.md)

## Outcome

Create a shared geometry foundation so media probe, project loading, viewer layout, and export all use the same raster and rotation rules.

## Scope

- Add a shared module for coded raster, display raster, aspect ratio, and rotation helpers.
- Move duplicated display-size and rotation logic out of IPC, media probe, and renderer helpers.
- Define stable validation limits and fallback behavior for legacy media metadata.

## Implementation Notes

- Treat this as prerequisite refactor work for both Phase 08 and Phase 09, even though the task is tracked ahead of Phase 09 implementation.
- The shared geometry module should be usable from both `src/shared/` and `src/main/` without pulling renderer-specific types into the domain layer.

## Acceptance Criteria

- One shared module defines rotation normalization and display-size derivation.
- Media geometry rules are no longer duplicated across `src/shared/ipc.ts`, `src/main/mediaProbe.ts`, and `src/renderer/App.tsx`.
- Existing projects and imported media still resolve to the same geometry where no new behavior is intended.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
