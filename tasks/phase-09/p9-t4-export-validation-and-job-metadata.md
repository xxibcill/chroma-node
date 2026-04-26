# [P9-T4] Export Validation And Job Metadata

## Status

Not started

## Phase

[Phase 09 - Flexible Export Geometry](../../roadmap/phase-09-flexible-export-geometry.md)

## Outcome

Validate geometry selections and report final output raster through export job status and results.

## Scope

- Reject invalid or unsupported custom output dimensions.
- Surface final output width and height in progress and result metadata.
- Keep overwrite and path validation behavior intact.

## Implementation Notes

- Job reporting should reflect the actual output raster, not merely the source media dimensions.
- Validation messages should distinguish bad dimensions from unsupported transform combinations.

## Acceptance Criteria

- Invalid custom geometry is rejected before encode starts.
- Export progress and result metadata reflect the final output raster.
- Existing export path and overwrite protections continue to work.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
