# [PRE-P9-T2] Export Geometry Schema And Contracts

## Status

Complete

## Phase

[Phase 09 - Flexible Export Geometry](../../roadmap/phase-09-flexible-export-geometry.md)

## Outcome

Make export geometry explicit in project and IPC models before the export pipeline and renderer start using preset and custom output sizes.

## Scope

- Extend `ProjectExportSettings` with output size mode, preset, custom dimensions, and resize policy.
- Add shared export geometry types that describe planned output raster and resize behavior.
- Keep backward-compatible defaults so older projects still load to current source-sized export behavior.

## Implementation Notes

- Keep the serialized schema narrow and readable so saved project files stay easy to inspect.
- Avoid introducing renderer-only labels into shared IPC types; shared models should express behavior, not presentation copy.

## Acceptance Criteria

- Export settings can represent source, preset, and custom geometry choices.
- Resize behavior is explicit in shared types rather than inferred from source media.
- Older project files load with stable defaults and no migration breakage.

## Progress

- [ ] Not started
- [ ] In progress
- [x] Implemented
- [x] Verified

## Implementation Audit - 2026-05-15

Status: Complete.

Evidence:
- `ProjectExportSettings` in `src/shared/project.ts` supports `sizeMode`, `preset`, `customWidth`, `customHeight`, and explicit `resizePolicy`.
- Export presets and resize policy types are shared through project and IPC contracts.
- Project validation supplies backward-compatible defaults for missing or invalid export geometry fields.
- Unit coverage exists in `src/shared/project.test.ts` and `src/main/exportPlanning.test.ts`.

Remaining work:
- None for this task.

## Blockers

- None
