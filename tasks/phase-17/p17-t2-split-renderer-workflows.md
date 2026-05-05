# [P17-T2] Split Renderer Workflows

## Status

Not started

## Phase

[Phase 17 - Architecture and Quality Foundation](../../roadmap/phase-17-architecture-and-quality-foundation.md)

## Outcome

Split the renderer shell into workflow modules so project/session state, playback, scopes, tracking, export, command search, gallery stills, and Color page UI can evolve independently.

## Scope

- Extract project/session state, media import, save/open, relink, and undo/redo behavior from `App.tsx`.
- Extract playback and preview-frame orchestration into a focused workflow hook or controller.
- Extract scopes analysis scheduling and canvas drawing coordination from the main app component.
- Extract tracking orchestration and cancellation into a focused workflow boundary.
- Extract export state, settings updates, progress subscription, cancellation, and result handling.
- Move inline UI sections into focused components with stable props.

## Implementation Notes

- Current hotspot: `src/renderer/App.tsx`.
- Keep behavior unchanged while moving ownership boundaries.
- Use the existing `window.chromaNode` API through a local adapter shape so renderer workflow tests can provide test doubles.
- Avoid broad visual redesign during this task; layout changes belong to usability phases unless needed for safe extraction.

## Acceptance Criteria

- `App.tsx` primarily composes workflow hooks and UI components instead of owning every callback directly.
- Import/open/save/relink, playback, scopes, tracking, export, command search, and gallery behavior each have a clear owner.
- Existing unit, lint, and typecheck suites pass.
- At least one focused test covers each extracted workflow boundary that owns meaningful state transitions.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

