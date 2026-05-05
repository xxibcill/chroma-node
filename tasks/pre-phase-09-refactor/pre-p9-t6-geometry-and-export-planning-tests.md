# [PRE-P9-T6] Geometry And Export Planning Tests

## Status

Not started

## Phase

[Phase 09 - Flexible Export Geometry](../../roadmap/phase-09-flexible-export-geometry.md)

## Outcome

Add focused tests around shared geometry and export planning so later Phase 08 and Phase 09 behavior changes are protected by deterministic coverage.

## Scope

- Add unit tests for portrait, square, rotated, and landscape geometry planning.
- Add export planning tests for source, preset, custom, fit, crop, and pad scenarios.
- Update task and status tracking notes so the pre-Phase-09 refactor work is visible in roadmap execution.

## Implementation Notes

- Prioritize direct tests of pure planning functions over only exercising behavior through end-to-end export runs.
- Keep verification centered on planned raster, transform mode, and backward-compatible defaults rather than visual-style golden outputs.

## Acceptance Criteria

- Shared geometry modules have direct unit coverage for rotated and non-rotated media.
- Export planning has direct unit coverage for source, portrait preset, square preset, crop, and pad cases.
- Refactor progress is represented in task tracking so pre-Phase-09 work is not hidden behind stale status notes.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
