# [PRE-P9-T4] Export Workflow UI Extraction

## Status

Not started

## Phase

[Phase 09 - Flexible Export Geometry](../../roadmap/phase-09-flexible-export-geometry.md)

## Outcome

Extract export controls, export progress handling, and export summary UI from the root renderer component so Phase 09 can add geometry controls without expanding `App.tsx`.

## Scope

- Move export settings and export status UI into focused renderer components.
- Extract export start and cancel behavior into a dedicated controller or hook.
- Preserve existing quality selection and progress behavior while preparing for preset and custom geometry controls.

## Implementation Notes

- This task is about isolation and ownership, not about changing export behavior yet.
- The extracted controller should consume shared export types so the later Phase 09 UI can stay close to the contract boundary.

## Acceptance Criteria

- Export UI is no longer implemented inline in `src/renderer/App.tsx`.
- Export orchestration logic has a dedicated renderer owner separate from viewer, scopes, and grading controls.
- Current export quality and progress behavior remains unchanged after the extraction.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
