# P6-T4 Export Progress Cancel

## Status

Done

## Phase

[Phase 06 - H.264 Export](../../roadmap/phase-06-h264-export.md)

## Outcome

The user can monitor export progress and cancel an in-progress export safely.

## Scope

- Show current frame, total frames, percent, and elapsed time.
- Add cancel action.
- Stop decode, render, and encode work on cancel.
- Clean up incomplete output files.
- Restore editable UI state after completion, failure, or cancellation.

## Implementation Notes

- Use process and worker cancellation primitives rather than waiting for natural completion.
- Do not delete completed exports.
- Report cancellation as a distinct state, not as a generic failure.

## Acceptance Criteria

- Progress increments during export.
- Cancel stops work promptly.
- Partial output is deleted unless user explicitly keeps it.
- UI can start a new export after cancellation.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Blockers

- None
