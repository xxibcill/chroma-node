# Phase 05 - Translation Tracking

## Status

Done

## Functional Feature Outcome

The user can track an ellipse or rectangle power window forward or backward using translation-only tracking keyframes.

## Why This Phase Exists

Tracking demonstrates how color systems bind masks to image motion. This phase adds frame-to-frame analysis, generated keyframes, confidence handling, and recoverable failure behavior without expanding into scale, rotation, or perspective tracking.

## Scope

- Track the selected power window forward.
- Track the selected power window backward.
- Generate normalized dx/dy keyframes per frame.
- Score confidence and stop on failure.
- Apply generated translations during preview and export.

## Tasks

| Task | Summary |
| --- | --- |
| [P5-T1](../tasks/phase-05/p5-t1-tracking-data-model.md) | Add tracking keyframe data model and stale-track behavior. |
| [P5-T2](../tasks/phase-05/p5-t2-frame-access-for-tracking.md) | Provide deterministic adjacent-frame access for tracking workers. |
| [P5-T3](../tasks/phase-05/p5-t3-template-matching-tracker.md) | Implement translation-only template matching or phase correlation. |
| [P5-T4](../tasks/phase-05/p5-t4-tracking-ui-and-progress.md) | Add track forward/backward controls, progress, cancellation, and failure reporting. |
| [P5-T5](../tasks/phase-05/p5-t5-tracked-window-playback.md) | Apply tracking keyframes to window masks during playback and render. |

## Dependencies

- Phase 03 is complete.
- Power windows exist and can be selected.
- Exact frame access is available outside the UI thread.

## Exit Criteria

- Forward and backward tracking produce keyframes.
- Low-confidence tracking stops with a clear frame-specific error.
- Tracked windows move during playback.
- Manual window edits after tracking mark the track as stale or require retracking.
