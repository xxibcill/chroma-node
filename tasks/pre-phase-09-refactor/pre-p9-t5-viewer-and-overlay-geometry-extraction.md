# [PRE-P9-T5] Viewer And Overlay Geometry Extraction

## Status

Not started

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
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
