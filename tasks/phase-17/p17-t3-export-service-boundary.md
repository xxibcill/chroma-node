# [P17-T3] Export Service Boundary

## Status

Not started

## Phase

[Phase 17 - Architecture and Quality Foundation](../../roadmap/phase-17-architecture-and-quality-foundation.md)

## Outcome

Create a compact export service interface that hides planning, FFmpeg process orchestration, frame rendering, resizing, audio merge, validation, cancellation, and progress reporting.

## Scope

- Define one export service boundary used by video export, still export, and image sequence export where practical.
- Keep export planning, geometry validation, codec selection, output path handling, overwrite checks, and job snapshot creation behind the boundary.
- Encapsulate FFmpeg decode/encode process management and progress emission.
- Encapsulate audio passthrough merge and output validation.
- Support deterministic cancellation and cleanup behavior.
- Preserve existing export result and error semantics.

## Implementation Notes

- Current hotspots include `src/main/exportProject.ts`, `src/main/exportPlanning.ts`, `src/main/exportStill.ts`, `src/main/exportSequence.ts`, `src/main/ffmpeg.ts`, and `src/main/process.ts`.
- FFmpeg is a true external dependency, so the service should accept a process adapter or command runner for tests.
- Prefer boundary tests with fake process streams and temp outputs over tests that assert private helper details.
- Keep existing export formats and codec behavior intact during migration.

## Acceptance Criteria

- IPC handlers call a small export service interface rather than coordinating export internals directly.
- Cancellation kills active child processes, removes temporary output, and emits a consistent cancellation result.
- Export validation covers codec, raster, frame count, fps, audio presence, and container metadata through the service boundary.
- Tests cover success, overwrite protection, encoder unavailable, decode failure, encode failure, audio merge failure, validation failure, and cancellation.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

