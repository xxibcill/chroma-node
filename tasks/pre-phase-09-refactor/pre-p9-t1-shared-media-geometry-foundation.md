# [PRE-P9-T1] Shared Media Geometry Foundation

## Status

Partial

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
- [x] In progress
- [ ] Implemented
- [ ] Verified

## Implementation Audit - 2026-05-15

Status: Partial.

Evidence:
- Shared geometry foundation exists in `src/shared/mediaGeometry.ts` with coded/display raster types, rotation normalization, display-size derivation, aspect ratio helpers, raster limits, containment, resize, and overlay mapping helpers.
- `src/main/mediaProbe.ts` and `src/main/mediaRelink.ts` consume shared geometry helpers for display raster and validation.
- Existing project loading derives legacy display dimensions in `src/shared/project.ts`.

Remaining work:
- Remove duplicated `getDisplaySize()` logic from `src/shared/ipc.ts`.
- Remove duplicated viewer containment and overlay geometry helpers still embedded in `src/renderer/App.tsx`.
- Consolidate renderer geometry consumers onto the shared/testable helpers before marking verified.

## Blockers

- None
