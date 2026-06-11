# [PRE-P9-T4] Export Workflow UI Extraction

## Status

Partial

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
- [x] In progress
- [ ] Implemented
- [ ] Verified

## Implementation Audit - 2026-05-15

Status: Partial.

Evidence:
- Export geometry controls live in `src/renderer/components/ExportSettingsPanel.tsx`.
- Standalone `ExportProgressPanel`, `ExportSummary`, `ExportCard`, and `useExport` modules exist.
- Existing export quality, codec, workflow preset, progress, and cancel behavior still passes tests.

Remaining work:
- `src/renderer/App.tsx` still defines inline `ExportProgressPanel` and `ExportSummary` instead of using the extracted files.
- Export orchestration state is still owned by `App.tsx`; `src/renderer/hooks/useExport.ts` exists but is not wired into the root workflow.
- Complete this task by moving progress/summary rendering and start/cancel ownership out of `App.tsx`.

## Blockers

- None
