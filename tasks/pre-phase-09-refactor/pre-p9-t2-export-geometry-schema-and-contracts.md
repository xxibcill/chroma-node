# [PRE-P9-T2] Export Geometry Schema And Contracts

## Status

Not started

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
- [ ] Implemented
- [ ] Verified

## Blockers

- None
