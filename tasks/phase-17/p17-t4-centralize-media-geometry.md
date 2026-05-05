# [P17-T4] Centralize Media Geometry

## Status

Not started

## Phase

[Phase 17 - Architecture and Quality Foundation](../../roadmap/phase-17-architecture-and-quality-foundation.md)

## Outcome

Create one canonical geometry module for coded raster, display raster, rotation, viewer containment, overlay mapping, scopes sampling, tracking coordinates, and export resize behavior.

## Scope

- Consolidate display-size and rotation helpers into `src/shared/mediaGeometry.ts`.
- Define canonical types for coded raster, display raster, contained rect, normalized point, resize policy, and overlay mapping.
- Move duplicated geometry calculations out of IPC types, export planning, viewer helpers, and overlay code.
- Ensure fit, crop, and pad calculations are shared by export planning and frame resizing.
- Cover portrait, square, rotated, DCI, and 4K-equivalent raster cases.

## Implementation Notes

- Current hotspots include `src/shared/mediaGeometry.ts`, `src/shared/ipc.ts`, `src/main/exportPlanning.ts`, `src/main/exportProject.ts`, and geometry helpers inside `src/renderer/App.tsx`.
- Treat this as an in-process dependency refactor.
- Phase 08 already identifies geometry mismatch as an open cross-phase risk; this task should reduce that risk directly.
- Prefer shared geometry tests over separate tests for each caller's local math.

## Acceptance Criteria

- There is one shared implementation for display size, normalized rotation, contained viewer rect, fit/crop/pad planning, and normalized overlay mapping.
- Renderer overlays, scopes, tracking, and export all use the shared geometry helpers.
- Tests cover rotated 90/270 media, portrait media, square media, widescreen media, crop behavior, pad behavior, and fit behavior.
- No duplicated `getDisplaySize` logic remains outside the canonical geometry module.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

