# P6-T2 Offscreen Render Export

## Status

Done

## Phase

[Phase 06 - H.264 Export](../../roadmap/phase-06-h264-export.md)

## Outcome

The export worker can render each source frame through the same grading graph used by preview.

## Scope

- Create offscreen WebGL rendering context or equivalent render path.
- Decode source frames in order.
- Apply nodes, qualifier, windows, and tracking.
- Read back processed RGBA frames.
- Report per-frame render errors.

## Implementation Notes

- The export render path must reuse the color engine shader generator.
- Keep export renderer independent from visible viewer state.
- Use source resolution for output frames.

## Acceptance Criteria

- Neutral export frames match source frames within expected encode tolerance.
- Graded export frames match preview readback within tolerance before H.264 compression.
- Render errors include frame number.
- Export renderer handles all 1 to 3 node configurations.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Blockers

- None
