# [P9-T5] Export Geometry Verification

## Status

Not started

## Phase

[Phase 09 - Flexible Export Geometry](../../roadmap/phase-09-flexible-export-geometry.md)

## Outcome

Verify source, preset, crop, and pad export paths against expected output geometry.

## Scope

- Add focused tests for source, portrait, square, crop, and pad exports.
- Verify output raster, frame count, and orientation metadata where relevant.
- Document a minimum verification matrix for future release passes.

## Implementation Notes

- Prioritize tests that prove geometry correctness over visual-style golden tests.
- Include at least one portrait export path driven from a landscape source clip.

## Acceptance Criteria

- Test coverage exists for source, portrait preset, square preset, crop, and pad exports.
- Verification confirms final output raster matches the selected export plan.
- Future verification work has a documented geometry test matrix to follow.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
