# P6-T1 Export Job Model

## Status

Not started

## Phase

[Phase 06 - H.264 Export](../../roadmap/phase-06-h264-export.md)

## Outcome

Export operations use an immutable job snapshot with validated settings and predictable lifecycle state.

## Scope

- Define export settings and job state.
- Snapshot project state at export start.
- Validate output path, codec, resolution, and media presence.
- Prevent accidental overwrite without confirmation.
- Track pending, running, canceled, failed, and completed states.

## Implementation Notes

- UI edits after export starts must not affect the active export job.
- Export settings are MVP-limited to MP4/H.264.
- Store no audio options because audio is out of scope.

## Acceptance Criteria

- Export cannot start without valid media.
- Export snapshot remains stable after UI edits.
- Existing output files require confirmation.
- Export job state is visible to the UI.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

