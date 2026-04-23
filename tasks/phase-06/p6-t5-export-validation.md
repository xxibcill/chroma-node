# P6-T5 Export Validation

## Status

Done

## Phase

[Phase 06 - H.264 Export](../../roadmap/phase-06-h264-export.md)

## Outcome

Automated and manual validation prove that exported files match MVP expectations.

## Scope

- Probe exported files with FFprobe.
- Validate codec, container, dimensions, frame rate, and audio absence.
- Compare selected export frames against preview/golden references.
- Test export failure paths.

## Implementation Notes

- Use small deterministic clips for automated tests.
- Expect H.264 compression differences after encode.
- Compare pre-encode render frames for strict preview/export parity.

## Acceptance Criteria

- Exported metadata matches source and settings.
- Export with neutral grade is visually close to source.
- Export with nodes, masks, and tracking reflects current project snapshot.
- Disk/path/encoder failures are covered by tests or documented manual checks.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Blockers

- None
