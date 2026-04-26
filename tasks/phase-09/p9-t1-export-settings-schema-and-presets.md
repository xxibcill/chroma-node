# [P9-T1] Export Settings Schema And Presets

## Status

Not started

## Phase

[Phase 09 - Flexible Export Geometry](../../roadmap/phase-09-flexible-export-geometry.md)

## Outcome

Extend export settings with output size presets, custom dimensions, and resize policy.

## Scope

- Add preset and custom output size fields to project and IPC models.
- Represent resize behavior such as fit, crop, and pad explicitly.
- Define defaults and backward-compatible loading behavior.

## Implementation Notes

- Keep the schema narrow enough that export settings remain understandable in saved project files.
- Defaults should preserve current behavior when no new geometry settings are chosen.

## Acceptance Criteria

- Export settings can express source, preset, and custom output geometry.
- Resize policy is explicit rather than inferred.
- Older project files still load into a stable export default.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
