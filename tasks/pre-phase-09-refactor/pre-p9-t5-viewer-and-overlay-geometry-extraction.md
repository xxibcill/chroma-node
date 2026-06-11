# [PRE-P9-T5] Viewer And Overlay Geometry Extraction

## Status

Partial

## Phase

[Phase 09 - Flexible Export Geometry](../../roadmap/phase-09-flexible-export-geometry.md)

## Outcome

Move viewer containment, overlay placement, and pointer-space geometry helpers out of the root renderer component so display-space behavior is easier to validate and reuse.

## Scope

- Extract contained-rect and rotation helpers from `src/renderer/App.tsx`.
- Isolate window overlay geometry calculations into dedicated viewer utilities.
- Make display-space math reusable by viewer, overlays, scopes, and later export preview labels.

## Implementation Notes

- Keep DOM event handling in renderer components, but move pure geometry math into testable utility modules.
- This task should reduce the number of geometry decisions buried inside the root app component before Phase 08 and Phase 09 add more orientation cases.

## Acceptance Criteria

- Pure viewer and overlay geometry helpers live outside `src/renderer/App.tsx`.
- Containment and rotation logic can be tested without rendering the full app.
- Overlay behavior remains visually stable for existing landscape media after the extraction.

## Progress

- [ ] Not started
- [x] In progress
- [ ] Implemented
- [ ] Verified

## Implementation Audit - 2026-05-15

Status: Partial.

Evidence:
- `src/renderer/viewer/viewerGeometry.ts` contains pure viewer and overlay helpers for contained rects, SVG point conversion, power-window geometry, rotation, signed-degree normalization, and clamping.
- Shared geometry tests cover containment, rotation, resize, and overlay mapping behavior in `src/shared/mediaGeometry.test.ts`.

Remaining work:
- `src/renderer/App.tsx` still defines local copies of `getContainedRect`, `readSvgPoint`, `getWindowGeometry`, `rotatePixelPoint`, `normalizeSignedDegrees`, and `clamp01`.
- `viewerGeometry.ts` is not currently imported by `App.tsx`, so the extraction is not actually used by the root viewer/overlay workflow.
- Add direct tests for `viewerGeometry.ts` or route the root component through already-tested shared helpers.

## Blockers

- None
