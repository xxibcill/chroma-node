# P5-T1 Tracking Data Model

## Status

Not started

## Phase

[Phase 05 - Translation Tracking](../../roadmap/phase-05-translation-tracking.md)

## Outcome

The project model stores per-frame translation tracking keyframes for a selected power window.

## Scope

- Add tracking target window field.
- Add keyframe array with frame, dx, dy, and confidence.
- Add stale-track state or equivalent invalidation.
- Add validation for normalized offsets and frame bounds.

## Implementation Notes

- Store dx/dy normalized to frame dimensions.
- Tracking keyframes belong to a node, not global media.
- Manual edits after tracking should mark affected tracking data stale.

## Acceptance Criteria

- Tracking data serializes in project JSON.
- Invalid frame indexes are rejected.
- Invalid confidence values are clamped or rejected.
- Manual window edits produce a clear stale-track state.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

