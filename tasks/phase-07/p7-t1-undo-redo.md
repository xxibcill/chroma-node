# P7-T1 Undo Redo

## Status

Not started

## Phase

[Phase 07 - Hardening and Packaging](../../roadmap/phase-07-hardening-and-packaging.md)

## Outcome

The user can undo and redo meaningful grading and project edits.

## Scope

- Add undo/redo state history.
- Cover node operations.
- Cover primary, qualifier, and window edits.
- Cover tracking keyframe changes.
- Exclude playback-only state unless intentionally included.

## Implementation Notes

- Coalesce high-frequency slider changes into single undo steps.
- Avoid storing raw frame data in history.
- Keep history bounded to protect memory.

## Acceptance Criteria

- Undo reverses the last grading edit.
- Redo reapplies an undone edit.
- Slider drag creates a useful history entry, not one entry per pixel movement.
- History does not exceed the memory target.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

