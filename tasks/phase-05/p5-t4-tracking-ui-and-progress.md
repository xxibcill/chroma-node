# P5-T4 Tracking UI And Progress

## Status

Not started

## Phase

[Phase 05 - Translation Tracking](../../roadmap/phase-05-translation-tracking.md)

## Outcome

The user can start, monitor, cancel, and recover from forward or backward tracking operations.

## Scope

- Add track forward action.
- Add track backward action.
- Add selected tracking target control.
- Show progress by current frame and total frames.
- Add cancellation and failure messages.

## Implementation Notes

- Disable conflicting window edits while tracking is active.
- Preserve successful keyframes when tracking fails.
- Include the failure frame in user-facing errors.

## Acceptance Criteria

- Track forward starts from the current frame.
- Track backward starts from the current frame.
- Cancellation stops worker work and preserves prior stable state.
- Failure message identifies low confidence, bad window, or frame access failure where possible.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

