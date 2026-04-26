# [P9-T2] Fit Fill Pad Render Pipeline

## Status

Not started

## Phase

[Phase 09 - Flexible Export Geometry](../../roadmap/phase-09-flexible-export-geometry.md)

## Outcome

Implement export transforms for fit, fill/crop, and pad output behavior.

## Scope

- Compute output raster from export settings.
- Apply scaling, crop, and padding transforms before encode.
- Keep color evaluation and geometry transforms in a predictable order.

## Implementation Notes

- Define whether crop and pad happen in display space or coded space and keep that rule consistent.
- Preserve deterministic output dimensions and avoid stretching unless explicitly supported later.

## Acceptance Criteria

- Fit exports preserve full source image inside the target raster.
- Crop exports fill the target raster without letterboxing.
- Pad exports preserve the source image and add expected bars or background space.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
