# [P12-T1] Color Page Workbench Layout

## Status

Done (implemented as part of Phase 12 color page foundation work - see commit e57b57b)

## Phase

[Phase 12 - Resolve-Style Color Page Upgrade](../../roadmap/phase-12-resolve-style-color-page-upgrade.md)

## Outcome

Rebuild the main renderer into a dedicated Color page workbench with clear viewer, node graph, palette, scope, and support-panel regions.

## Scope

- Introduce a stable Color page shell with a large central viewer.
- Add palette tabs for Primaries, Curves, Qualifier, Windows, Tracker, Scopes, Gallery, and Export.
- Reserve a prominent region for the node graph without hiding the viewer.
- Separate grading controls from delivery/export controls while keeping export reachable.

## Implementation Notes

- Keep the existing `App.tsx` behavior intact during extraction by moving UI sections into focused renderer components.
- Preserve current keyboard, import, playback, save/open, relink, and export flows while reorganizing layout.
- Use existing CSS conventions first, then add layout tokens only where repeated across the new workbench.
- Avoid marketing-style page sections; this is a dense production tool surface.

## Acceptance Criteria

- The default screen presents the viewer, node graph, palette controls, and scopes as a coherent Color page.
- Existing MVP workflows remain available from the new layout.
- Export controls are no longer visually mixed into the primary grading controls.
- The layout remains usable at supported desktop viewport sizes without text or controls overlapping.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
