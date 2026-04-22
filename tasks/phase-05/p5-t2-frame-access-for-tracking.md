# P5-T2 Frame Access For Tracking

## Status

Not started

## Phase

[Phase 05 - Translation Tracking](../../roadmap/phase-05-translation-tracking.md)

## Outcome

The tracking worker can request deterministic adjacent frames without depending on viewer playback state.

## Scope

- Add exact frame accessor for worker use.
- Support current frame, previous frame, and next frame access.
- Provide grayscale or luminance frame data to the tracker.
- Handle frame access errors with frame numbers.

## Implementation Notes

- Use FFmpeg-backed extraction where exactness matters.
- Tracking may use half-resolution frames for speed.
- Keep frame access cancellable.

## Acceptance Criteria

- Worker can fetch frame N and frame N+1.
- Worker can fetch frame N and frame N-1.
- Returned frame data dimensions are known.
- Access failure includes media path and frame number context.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

